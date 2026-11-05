// Helper bersama untuk skrip yang memakai Supabase LOKAL (`supabase start`).
// Akun di bawah hanya ada di stack lokal 127.0.0.1 untuk pengujian — bukan kredensial produksi.
import { execFileSync } from "node:child_process";

export const LOCAL_USERS = {
  owner: { email: "pemilik@acadocs.test", password: "acadocs-lokal-pemilik-1" },
  other: { email: "bukan-pemilik@acadocs.test", password: "acadocs-lokal-lain-1" },
};

/** Baca konfigurasi stack lokal; keluar dengan pesan jelas bila belum berjalan atau bukan lokal. */
export function readLocalStatus() {
  let raw = "";
  try {
    raw = execFileSync("supabase", ["status", "-o", "env"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    // ditangani di bawah
  }
  const status = Object.fromEntries(
    raw
      .split("\n")
      .map((line) => line.match(/^([A-Z_]+)="?([^"]*)"?$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2]]),
  );
  if (!status.API_URL || !status.SERVICE_ROLE_KEY) {
    console.error("Supabase lokal belum berjalan. Jalankan dulu: supabase start");
    process.exit(1);
  }
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(status.API_URL)) {
    console.error("Skrip ini hanya untuk Supabase lokal.");
    process.exit(1);
  }
  return status;
}

export async function ensureUser(admin, { email, password }) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = data?.users.find((user) => user.email === email);
  if (existing) return existing.id;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  return created.data.user.id;
}
