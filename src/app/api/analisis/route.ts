import OpenAI from "openai";
import { ANALYSIS_SCHEMA, normalizeAnalysis } from "@/lib/analysis";
import { MAX_GUIDE_CHARS, MAX_THESIS_CHARS } from "@/lib/thesis-scan";
import { createClient } from "@/lib/supabase/server";
import { analysisPrompt, ANALYSIS_SYSTEM } from "@/server/analysis-prompt";
import { aiConfigured, analysisModel, apiKeyProblem, openAIApiKey } from "@/server/analysis";
import { getOwner } from "@/server/auth";
import { getDocument } from "@/server/queries";

// Analisis naskah panjang bisa beberapa menit.
export const maxDuration = 300;

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
function aiError(error: unknown, model: string) {
  if (error instanceof OpenAI.AuthenticationError) {
    return "OpenAI menolak API key ini: salah salin, sudah dihapus, atau milik project lain. Buat key baru di platform.openai.com → API keys, ganti nilai OPENAI_API_KEY di Vercel, lalu redeploy.";
  }
  if (error instanceof OpenAI.PermissionDeniedError) {
    return `API key ini tidak punya izin memakai model ${model}. Periksa izin project di platform.openai.com, atau atur OPENAI_MODEL ke model yang tersedia.`;
  }
  if (error instanceof OpenAI.NotFoundError) {
    return `Model ${model} tidak tersedia untuk akun OpenAI-mu. Atur OPENAI_MODEL di Vercel ke model yang tersedia, lalu redeploy.`;
  }
  if (error instanceof OpenAI.RateLimitError) {
    return error.code === "insufficient_quota"
      ? "Saldo/kuota OpenAI habis. Isi kredit di platform.openai.com → Billing, lalu coba lagi."
      : "Batas pemakaian OpenAI tercapai. Coba lagi beberapa menit lagi.";
  }
  if (error instanceof OpenAI.BadRequestError) return "Permintaan analisis ditolak OpenAI. Coba lagi, atau kabari bila terus terjadi.";
  if (error instanceof OpenAI.APIConnectionTimeoutError) return "Analisis terlalu lama. Coba lagi sebentar lagi.";
  if (error instanceof OpenAI.APIUserAbortError) return "Analisis dihentikan karena terlalu lama.";
  if (error instanceof OpenAI.APIConnectionError) return "Tidak bisa terhubung ke OpenAI. Coba lagi.";
  if (error instanceof OpenAI.APIError) return "Layanan OpenAI sedang sibuk. Coba lagi sebentar lagi.";
  return "Analisis gagal. Coba lagi.";
}

export async function POST(request: Request) {
  const owner = await getOwner();
  if (!owner) return fail(401, "Sesi berakhir. Masuk lagi untuk melanjutkan.");
  if (!aiConfigured()) return fail(503, "Fitur Cek Progres belum disiapkan: OPENAI_API_KEY belum diisi di server.");
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
  const model = analysisModel();

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
        const client = new OpenAI({ apiKey: openAIApiKey() });
        const response = client.responses.stream(
          {
            model,
            instructions: ANALYSIS_SYSTEM,
            input: analysisPrompt({
              thesisName: doc.name,
              format: input.thesis.format,
              text: input.thesis.text,
              highlightCount: input.thesis.highlightCount,
              guide: guideDoc && input.guide ? { name: guideDoc.name, outline: input.guide.outline } : undefined,
            }),
            text: { format: { type: "json_schema", name: "analisis_skripsi", schema: ANALYSIS_SCHEMA, strict: true } },
            reasoning: { effort: "medium" },
            max_output_tokens: 40000,
            // Naskah tidak disimpan di OpenAI setelah analisis selesai.
            store: false,
          },
          { signal },
        );
        response.on("response.output_text.delta", (event) => {
          written += event.delta.length;
        });

        const final = await response.finalResponse();
        const refused = final.output.some(
          (item) => item.type === "message" && item.content.some((part) => part.type === "refusal"),
        );
        if (refused) throw new Error("OpenAI menolak menganalisis naskah ini.");
        if (final.status === "incomplete") {
          throw new Error(
            final.incomplete_details?.reason === "max_output_tokens"
              ? "Hasil analisis terlalu panjang dan terpotong. Coba lagi."
              : "Analisis tidak selesai. Coba lagi.",
          );
        }

        let result = null;
        try {
          result = normalizeAnalysis(JSON.parse(final.output_text));
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
            model: final.model ?? model,
            input_tokens: final.usage?.input_tokens ?? null,
            output_tokens: final.usage?.output_tokens ?? null,
          })
          .select("id")
          .single();
        if (error || !data) throw new Error("Hasil analisis gagal disimpan. Coba lagi.");
        send({ type: "done", id: data.id });
      } catch (error) {
        if (error instanceof OpenAI.OpenAIError) {
          // Hanya kelas/status error yang dicatat — tidak pernah isi naskah atau API key.
          console.error("[acadocs] analisis AI gagal", error.constructor.name, error instanceof OpenAI.APIError ? error.status : "");
          send({ type: "error", message: aiError(error, model) });
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
