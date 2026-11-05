// Jalankan Acadocs melawan Supabase LOKAL (`supabase start`), bukan project remote.
// .env.local tidak disentuh: nilai lokal dioper lewat environment proses (prioritasnya lebih tinggi).
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { LOCAL_USERS, ensureUser, readLocalStatus } from "./local-supabase.mjs";

const PORT = process.env.PORT ?? "3100";
const status = readLocalStatus();
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ownerId = await ensureUser(admin, LOCAL_USERS.owner);
await ensureUser(admin, LOCAL_USERS.other);
console.log(`Acadocs (Supabase lokal) → http://localhost:${PORT} · akun uji lokal siap`);

const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY || status.ANON_KEY,
  ACADOCS_OWNER_ID: ownerId,
};
const next = (args) => spawn("npx", ["next", ...args], { stdio: "inherit", env });

function serve(child) {
  child.on("exit", (code) => process.exit(code ?? 0));
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
}

// --prod: build + start (berguna bila `next dev` lain sedang berjalan di folder ini).
// Catatan: build ini memakai URL Supabase lokal; jalankan `npm run build` lagi sebelum deploy.
if (process.argv.includes("--prod")) {
  next(["build"]).on("exit", (code) => (code ? process.exit(code) : serve(next(["start", "--port", PORT]))));
} else {
  serve(next(["dev", "--port", PORT]));
}
