import Anthropic from "@anthropic-ai/sdk";
import { ANALYSIS_SCHEMA, normalizeAnalysis } from "@/lib/analysis";
import { MAX_GUIDE_CHARS, MAX_THESIS_CHARS } from "@/lib/thesis-scan";
import { createClient } from "@/lib/supabase/server";
import { analysisPrompt, ANALYSIS_SYSTEM } from "@/server/analysis-prompt";
import { aiConfigured, anthropicApiKey, apiKeyProblem } from "@/server/analysis";
import { getOwner } from "@/server/auth";
import { getDocument } from "@/server/queries";

// Analisis naskah panjang bisa beberapa menit.
export const maxDuration = 300;

const MODEL = "claude-opus-5-5";
const TIME_LIMIT_MS = 285_000;

type Body = {
  documentId: string;
  version: number;
  thesis: { format: "docx" | "pdf"; text: string; highlightCount: number };
  guide?: { documentId: string; outline: string };
};

function readBody(raw: unknown): Body | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const thesis = data.thesis as Record<string, unknown> | undefined;
  const guide = data.guide as Record<string, unknown> | undefined;
  if (typeof data.documentId !== "string" || !Number.isInteger(data.version)) return null;
  if (!thesis || (thesis.format !== "docx" && thesis.format !== "pdf") || typeof thesis.text !== "string") return null;
  if (!thesis.text.trim() || thesis.text.length > MAX_THESIS_CHARS) return null;
  if (guide && (typeof guide.documentId !== "string" || typeof guide.outline !== "string")) return null;
  if (guide && (guide.outline as string).length > MAX_GUIDE_CHARS + 1000) return null;
  return {
    documentId: data.documentId,
    version: data.version as number,
    thesis: {
      format: thesis.format,
      text: thesis.text,
      highlightCount: Number.isInteger(thesis.highlightCount) ? Math.max(0, thesis.highlightCount as number) : 0,
    },
    guide: guide ? { documentId: guide.documentId as string, outline: guide.outline as string } : undefined,
  };
}

const fail = (status: number, error: string) => Response.json({ error }, { status });

/** Pesan yang bisa dipahami untuk kegagalan layanan AI (tanpa membocorkan detail teknis). */
function aiError(error: unknown) {
  if (error instanceof Anthropic.AuthenticationError) {
    return "Anthropic menolak API key ini: salah salin, sudah dihapus/dinonaktifkan, atau milik akun lain. Buat key baru di console.anthropic.com → API Keys, ganti nilai ANTHROPIC_API_KEY di Vercel, lalu redeploy.";
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return "API key ini tidak punya izin memakai model Claude yang dibutuhkan. Periksa pengaturan workspace di console.anthropic.com, atau buat key dari workspace lain.";
  }
  if (error instanceof Anthropic.NotFoundError) return "Model Claude untuk analisis tidak tersedia di akun Anthropic ini.";
  if (error instanceof Anthropic.RateLimitError) return "Batas pemakaian AI tercapai. Coba lagi beberapa menit lagi.";
  if (error instanceof Anthropic.BadRequestError) {
    return /credit|billing|balance/i.test(error.message)
      ? "Saldo kredit Anthropic habis. Isi ulang di console.anthropic.com lalu coba lagi."
      : "Permintaan analisis ditolak layanan AI. Coba lagi, atau kabari bila terus terjadi.";
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) return "Analisis terlalu lama. Coba lagi sebentar lagi.";
  if (error instanceof Anthropic.APIUserAbortError) return "Analisis dihentikan karena terlalu lama.";
  if (error instanceof Anthropic.APIConnectionError) return "Tidak bisa terhubung ke layanan AI. Coba lagi.";
  if (error instanceof Anthropic.APIError) return "Layanan AI sedang sibuk. Coba lagi sebentar lagi.";
  return "Analisis gagal. Coba lagi.";
}

export async function POST(request: Request) {
  const owner = await getOwner();
  if (!owner) return fail(401, "Sesi berakhir. Masuk lagi untuk melanjutkan.");
  if (!aiConfigured()) return fail(503, "Fitur Cek Progres belum disiapkan: ANTHROPIC_API_KEY belum diisi di server.");
  const keyProblem = apiKeyProblem();
  if (keyProblem) return fail(503, keyProblem);

  let body: Body | null = null;
  try {
    body = readBody(await request.json());
  } catch {
    body = null;
  }
  if (!body) return fail(400, "Data analisis tidak valid atau naskah terlalu panjang.");

  const doc = await getDocument(body.documentId);
  if (!doc || doc.folder !== "skripsi-lengkap") return fail(404, "File skripsi tidak ditemukan.");
  if (doc.version !== body.version) return fail(409, "File skripsi baru saja diganti. Muat ulang halaman lalu coba lagi.");
  const guideDoc = body.guide ? await getDocument(body.guide.documentId) : null;
  if (body.guide && (!guideDoc || guideDoc.folder !== "skripsi-panduan")) return fail(404, "File skripsi panduan tidak ditemukan.");
  const input = body;

  const encoder = new TextEncoder();
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(TIME_LIMIT_MS)]);

  // NDJSON: {type:"progress"} selama model bekerja, lalu {type:"done"} atau {type:"error"}.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // Browser sudah menutup koneksi.
        }
      };
      let written = 0;
      const heartbeat = setInterval(() => send({ type: "progress", written }), 5000);

      try {
        const client = new Anthropic({ apiKey: anthropicApiKey() });
        const response = client.beta.messages.stream(
          {
            model: MODEL,
            max_tokens: 64000,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            thinking: { type: "adaptive" },
            output_config: { effort: "high", format: { type: "json_schema", schema: ANALYSIS_SCHEMA } },
            system: ANALYSIS_SYSTEM,
            messages: [
              {
                role: "user",
                content: analysisPrompt({
                  thesisName: doc.name,
                  format: input.thesis.format,
                  text: input.thesis.text,
                  highlightCount: input.thesis.highlightCount,
                  guide: guideDoc && input.guide ? { name: guideDoc.name, outline: input.guide.outline } : undefined,
                }),
              },
            ],
          },
          { signal },
        );
        response.on("text", (delta) => {
          written += delta.length;
        });

        const message = await response.finalMessage();
        if (message.stop_reason === "refusal") throw new Error("Layanan AI menolak menganalisis naskah ini.");
        if (message.stop_reason === "max_tokens") throw new Error("Hasil analisis terlalu panjang dan terpotong. Coba lagi.");

        const json = message.content.map((block) => (block.type === "text" ? block.text : "")).join("");
        let result = null;
        try {
          result = normalizeAnalysis(JSON.parse(json));
        } catch {
          result = null;
        }
        if (!result) throw new Error("Hasil analisis tidak bisa dibaca. Coba lagi.");

        const supabase = await createClient();
        const { data, error } = await supabase
          .from("analyses")
          .insert({
            document_id: doc.id,
            document_version: doc.version,
            guide_name: guideDoc?.name ?? null,
            highlight_count: input.thesis.highlightCount,
            result,
            model: message.model,
            input_tokens: message.usage.input_tokens,
            output_tokens: message.usage.output_tokens,
          })
          .select("id")
          .single();
        if (error || !data) throw new Error("Hasil analisis gagal disimpan. Coba lagi.");
        send({ type: "done", id: data.id });
      } catch (error) {
        if (error instanceof Anthropic.AnthropicError) {
          // Hanya status/kelas error yang dicatat — tidak pernah isi naskah atau API key.
          console.error("[acadocs] analisis AI gagal", error.constructor.name, error instanceof Anthropic.APIError ? error.status : "");
          send({ type: "error", message: aiError(error) });
        } else {
          send({ type: "error", message: error instanceof Error && error.message ? error.message : "Analisis gagal. Coba lagi." });
        }
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
