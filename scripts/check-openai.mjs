// Cek OPENAI_API_KEY tanpa menampilkan isinya: jenis key dari awalannya, lalu panggilan
// GRATIS ke Models API (tidak memakai token) untuk memastikan key & model analisis tersedia.
//
//   npm run check:ai      → membaca .env.local (atau environment yang sudah diset)
import OpenAI from "openai";

const DEFAULT_MODEL = "gpt-6-sol"; // sama dengan src/server/analysis.ts

const unquote = (value) => value.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
const key = unquote(unquote(process.env.OPENAI_API_KEY ?? "").replace(/^OPENAI_API_KEY\s*=\s*/, ""));
const model = unquote(process.env.OPENAI_MODEL ?? "") || DEFAULT_MODEL;

function done(ok, message) {
  console.log(`${ok ? "✓" : "✗"} ${message}`);
  process.exit(ok ? 0 : 1);
}

if (!key) done(false, "OPENAI_API_KEY belum diisi di .env.local.");

const kind = key.startsWith("sk-ant-")
  ? "API key Anthropic, BUKAN OpenAI"
  : key.startsWith("sk-admin-")
    ? "Admin key OpenAI, BUKAN API key biasa"
    : key.startsWith("sk-proj-")
      ? "API key OpenAI (project)"
      : key.startsWith("sk-svcacct-")
        ? "API key OpenAI (service account)"
        : key.startsWith("sk-")
          ? "API key OpenAI"
          : key.startsWith("AIza")
            ? "sepertinya API key Google Gemini, BUKAN OpenAI"
            : "bukan API key OpenAI";
console.log(`Jenis: ${kind} · panjang ${key.length} karakter`);
if (!key.startsWith("sk-") || key.startsWith("sk-ant-") || key.startsWith("sk-admin-")) {
  done(false, "Buat API key di platform.openai.com → API keys (diawali sk-).");
}
if (/\s/.test(key)) done(false, "Key berisi spasi/baris baru di tengahnya. Salin ulang utuh.");

const client = new OpenAI({ apiKey: key });
try {
  await client.models.retrieve(model);
  done(true, `Key diterima OpenAI dan model ${model} tersedia untuk akun ini.`);
} catch (error) {
  if (error instanceof OpenAI.AuthenticationError) done(false, "Key ditolak OpenAI (401): salah salin, sudah dihapus, atau dinonaktifkan.");
  if (error instanceof OpenAI.PermissionDeniedError) done(false, "Key tidak punya izin (403). Periksa izin project di platform.openai.com.");
  if (error instanceof OpenAI.NotFoundError) {
    // Daftar model gpt yang bisa dipakai akun ini (juga gratis).
    const available = [];
    for await (const item of client.models.list()) if (/^gpt-/.test(item.id)) available.push(item.id);
    const hint = available.sort().slice(-12).join(", ") || "tidak ada model gpt";
    done(false, `Model ${model} tidak tersedia untuk akun ini. Tersedia: ${hint}. Atur OPENAI_MODEL ke salah satunya.`);
  }
  if (error instanceof OpenAI.APIConnectionError) done(false, "Tidak bisa terhubung ke api.openai.com. Periksa koneksi internet.");
  if (error instanceof OpenAI.APIError) done(false, `OpenAI membalas error ${error.status}.`);
  throw error;
}
