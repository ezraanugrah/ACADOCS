// Uji akses Supabase Acadocs. Tidak pernah mencetak key atau password.
//
//   node scripts/verify-access.mjs local   → stack lokal (supabase start): anonim + 2 user uji
//                                            yang dibuat lalu dihapus otomatis.
//   node scripts/verify-access.mjs remote  → project di .env.local: hanya uji anonim,
//                                            semua percobaan tulis memang harus ditolak.
//   node scripts/verify-access.mjs owner   → seperti remote, lalu meminta email & password
//                                            pemilik (tidak ditampilkan) untuk uji login dan
//                                            akses pemilik. File uji dihapus lagi.
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";

const mode = process.argv[2];
if (!["local", "remote", "owner"].includes(mode)) {
  console.error("Pakai: node scripts/verify-access.mjs <local|remote|owner>");
  process.exit(2);
}

async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const value = await rl.question(question);
  rl.close();
  return value.trim();
}

// Input tersembunyi lewat raw mode stdin: tidak ada karakter yang di-echo, tidak disimpan.
function askHidden(question) {
  const stdin = process.stdin;
  if (!stdin.isTTY) throw new Error("Jalankan di terminal interaktif untuk mengetik password.");
  process.stdout.write(question);
  return new Promise((resolve) => {
    let value = "";
    const finish = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write("\n");
    };
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n" || char === "\u0004") {
          finish();
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          finish();
          process.exit(130); // Ctrl-C
        }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else if (char >= " ") value += char;
      }
    };
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.resume();
    stdin.on("data", onData);
  });
}

const BUCKET = "documents";
const MAX_BYTES = 52_428_800;
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
const results = [];

async function check(name, fn) {
  try {
    results.push([(await fn()) ? "LULUS" : "GAGAL", name]);
  } catch (error) {
    results.push(["GAGAL", `${name} — ${error.message}`]);
  }
}

function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

function loadConfig() {
  if (mode === "local") {
    const env = parseEnv(execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" }));
    return { url: env.API_URL, anonKey: env.ANON_KEY, serviceKey: env.SERVICE_ROLE_KEY };
  }
  const env = parseEnv(readFileSync(".env.local", "utf8")); // remote & owner
  return { url: env.NEXT_PUBLIC_SUPABASE_URL, anonKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY };
}

const pdf = (size = 2048) =>
  new Blob([Buffer.concat([Buffer.from("%PDF-1.4\n"), randomBytes(size)])], { type: "application/pdf" });
// Untuk Blob, supabase-js memakai blob.type sebagai MIME; opsi contentType diabaikan.
const textBlob = (text) => new Blob([text], { type: "text/plain" });
const pathFor = (ownerId, folder = "lampiran", ext = "pdf") => `${ownerId}/${folder}/${randomUUID()}.${ext}`;
const docRow = (path, overrides = {}) => ({
  folder: "lampiran",
  name: "Uji Akses.pdf",
  extension: "pdf",
  mime_type: "application/pdf",
  size_bytes: 2057,
  storage_path: path,
  ...overrides,
});

const { url, anonKey, serviceKey } = loadConfig();
if (!url || !anonKey) {
  console.error("URL atau key Supabase tidak ditemukan.");
  process.exit(2);
}

// ── Pengaturan Auth ───────────────────────────────────────────────
const settingsRes = await fetch(new URL("/auth/v1/settings", url), { headers: { apikey: anonKey } });
const settings = settingsRes.ok ? await settingsRes.json() : null;
await check(`auth: key diterima Supabase (HTTP ${settingsRes.status})`, () => settingsRes.ok);
await check("auth: signup publik dimatikan", () => settings?.disable_signup === true);
await check("auth: anonymous sign-in dimatikan", () => settings?.external?.anonymous_users === false);

// ── Akses anonim ─────────────────────────────────────────────────
const anon = createClient(url, anonKey, noSession);
const strangerPath = pathFor(randomUUID(), "lainnya", "txt");

await check("anon: tidak bisa membaca tabel documents", async () => {
  const { data, error } = await anon.from("documents").select("id");
  return Boolean(error) || data.length === 0;
});
await check("anon: tidak bisa insert ke documents", async () => {
  const { error } = await anon.from("documents").insert(docRow(strangerPath));
  return Boolean(error);
});
await check("anon: tidak bisa melihat isi bucket", async () => {
  const { data, error } = await anon.storage.from(BUCKET).list();
  return Boolean(error) || data.length === 0;
});
await check("anon: tidak bisa upload file", async () => {
  const { error } = await anon.storage
    .from(BUCKET)
    .upload(strangerPath, textBlob("uji"));
  return Boolean(error);
});
await check("anon: tidak bisa membuat signed URL", async () => {
  const { error } = await anon.storage.from(BUCKET).createSignedUrl(strangerPath, 60);
  return Boolean(error);
});
await check("anon: URL publik bucket tidak bisa dibuka", async () => {
  const res = await fetch(new URL(`/storage/v1/object/public/${BUCKET}/${strangerPath}`, url));
  return res.status !== 200;
});

// ── Pemilik asli di remote (password diketik pengguna) ───────────
if (mode === "owner") {
  const email = await ask("Email pemilik: ");
  const password = await askHidden("Password pemilik (tidak ditampilkan): ");
  const owner = createClient(url, anonKey, noSession);
  const signIn = await owner.auth.signInWithPassword({ email, password });
  await check("pemilik: login berhasil", () => !signIn.error && Boolean(signIn.data.user));
  if (signIn.error) {
    // Hanya metadata error yang aman; password & token tidak pernah dicetak.
    const { status, code, message, name } = signIn.error;
    console.log(`\nLogin gagal → HTTP ${status ?? "-"} | code: ${code ?? "-"} | ${name}: ${message}`);
    console.log(
      `Input → format email valid: ${/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "ya" : "tidak"}, ` +
        `password terisi: ${password.length > 0 ? "ya" : "tidak"}\n`,
    );
  }

  if (!signIn.error) {
    const uid = signIn.data.user.id;
    const path = pathFor(uid, "lainnya", "txt");
    const body = `uji akses acadocs ${randomUUID()}`;
    let docId = null;
    try {
      await check("pemilik: bisa membaca tabel documents", async () => {
        const { error } = await owner.from("documents").select("id").limit(1);
        return !error;
      });
      let uploaded = false;
      await check("pemilik: upload file uji ke foldernya", async () => {
        const { error } = await owner.storage.from(BUCKET).upload(path, textBlob(body));
        // Hanya metadata error Storage yang aman; tidak ada token.
        if (error) throw new Error(`HTTP ${error.status ?? "-"} | code ${error.statusCode ?? "-"} | ${error.message}`);
        uploaded = true;
        return true;
      });
      if (!uploaded) {
        // Jangan simpan metadata untuk file yang tidak ada.
        results.push(["GAGAL", "pemilik: metadata, signed URL & upsert dilewati karena upload gagal"]);
      } else {
        await check("pemilik: simpan metadata file uji", async () => {
          const { data, error } = await owner
            .from("documents")
            .insert(
              docRow(path, {
                folder: "lainnya",
                name: "uji-akses.txt",
                extension: "txt",
                mime_type: "text/plain",
                size_bytes: Buffer.byteLength(body),
              }),
            )
            .select()
            .single();
          if (error) throw error;
          docId = data.id;
          return data.owner_id === uid;
        });
        await check("pemilik: signed URL berfungsi", async () => {
          const { data, error } = await owner.storage.from(BUCKET).createSignedUrl(path, 60);
          if (error) throw error;
          const res = await fetch(data.signedUrl);
          return res.ok && (await res.text()) === body;
        });
        await check("pemilik: menimpa objek (upsert) ditolak", async () => {
          const { error } = await owner.storage
            .from(BUCKET)
            .upload(path, textBlob("timpa"), { upsert: true });
          return Boolean(error);
        });
      }
      await check("pemilik: upload ke folder user lain ditolak", async () => {
        const { error } = await owner.storage
          .from(BUCKET)
          .upload(pathFor(randomUUID(), "lainnya", "txt"), textBlob("x"));
        return Boolean(error);
      });
    } finally {
      // Bersihkan file uji walau ada cek yang gagal.
      if (docId) await owner.from("documents").delete().eq("id", docId);
      const removed = await owner.storage.from(BUCKET).remove([path]);
      await check("pemilik: file uji dibersihkan", async () => {
        const { data } = await owner.from("documents").select("id").eq("storage_path", path);
        return !removed.error && data?.length === 0;
      });
      await owner.auth.signOut({ scope: "local" });
    }
  }
}

// ── Pemilik vs pengguna lain (hanya lokal) ───────────────────────
if (mode === "local") {
  const admin = createClient(url, serviceKey, noSession);
  const users = [];

  async function makeUser(label) {
    const email = `uji-${label}-${randomUUID().slice(0, 8)}@acadocs.test`;
    const password = randomBytes(18).toString("base64url");
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    users.push(data.user.id);
    const client = createClient(url, anonKey, noSession);
    const signIn = await client.auth.signInWithPassword({ email, password });
    if (signIn.error) throw signIn.error;
    return { id: data.user.id, client };
  }

  try {
    await check("anon: signup ditolak (dicoba di lokal)", async () => {
      const { data, error } = await anon.auth.signUp({
        email: `daftar-${randomUUID().slice(0, 8)}@acadocs.test`,
        password: randomBytes(18).toString("base64url"),
      });
      if (data?.user?.id) users.push(data.user.id);
      return Boolean(error);
    });
    await check("anon: anonymous sign-in ditolak (dicoba di lokal)", async () => {
      const { error } = await anon.auth.signInAnonymously();
      return Boolean(error);
    });
    await check("bucket: privat, batas 50 MB, MIME dibatasi", async () => {
      const { data, error } = await admin.storage.getBucket(BUCKET);
      if (error) throw error;
      return (
        data.public === false &&
        data.file_size_limit === MAX_BYTES &&
        data.allowed_mime_types.includes("application/pdf") &&
        !data.allowed_mime_types.includes("text/html")
      );
    });

    const a = await makeUser("a");
    const b = await makeUser("b");
    const pathA = pathFor(a.id);
    const fileA = pdf();
    let docId = null;

    await check("pemilik: upload ke foldernya sendiri", async () => {
      const { error } = await a.client.storage
        .from(BUCKET)
        .upload(pathA, fileA, { contentType: "application/pdf" });
      return !error;
    });
    await check("pemilik: simpan metadata (owner_id & versi otomatis)", async () => {
      const { data, error } = await a.client
        .from("documents")
        .insert(docRow(pathA, { size_bytes: fileA.size }))
        .select()
        .single();
      if (error) throw error;
      docId = data.id;
      return data.owner_id === a.id && data.version === 1;
    });
    await check("pemilik: melihat file miliknya", async () => {
      const { data } = await a.client.from("documents").select("id");
      return data?.length === 1;
    });
    await check("pemilik: signed URL berfungsi dan isi file identik", async () => {
      const { data, error } = await a.client.storage.from(BUCKET).createSignedUrl(pathA, 60);
      if (error) throw error;
      const res = await fetch(data.signedUrl);
      const body = Buffer.from(await res.arrayBuffer());
      return res.ok && body.equals(Buffer.from(await fileA.arrayBuffer()));
    });
    await check("pemilik: download memakai nama asli", async () => {
      const { data } = await a.client.storage
        .from(BUCKET)
        .createSignedUrl(pathA, 60, { download: "BAB 1 Pendahuluan.pdf" });
      const res = await fetch(data.signedUrl);
      await res.arrayBuffer();
      return (res.headers.get("content-disposition") ?? "").includes("attachment");
    });
    await check("pemilik: menimpa objek (upsert) ditolak", async () => {
      const { error } = await a.client.storage
        .from(BUCKET)
        .upload(pathA, pdf(), { contentType: "application/pdf", upsert: true });
      return Boolean(error);
    });
    await check("pemilik: upload ke folder user lain ditolak", async () => {
      const { error } = await a.client.storage
        .from(BUCKET)
        .upload(pathFor(b.id), pdf(), { contentType: "application/pdf" });
      return Boolean(error);
    });
    await check("pemilik: tipe text/html ditolak bucket", async () => {
      const { error } = await a.client.storage
        .from(BUCKET)
        .upload(pathFor(a.id, "lainnya", "txt"), new Blob(["<script>1</script>"], { type: "text/html" }));
      return Boolean(error);
    });
    await check("pemilik: file lebih dari 50 MB ditolak", async () => {
      const { error } = await a.client.storage
        .from(BUCKET)
        .upload(pathFor(a.id), new Blob([Buffer.alloc(MAX_BYTES + 1)], { type: "application/pdf" }));
      return Boolean(error);
    });

    const rejects = async (row) => Boolean((await a.client.from("documents").insert(row)).error);
    await check("metadata: folder tak dikenal ditolak", () => rejects(docRow(pathFor(a.id), { folder: "rahasia" })));
    await check("metadata: path milik user lain ditolak", () => rejects(docRow(pathFor(b.id))));
    await check("metadata: path tidak aman ditolak", () => rejects(docRow(`${a.id}/../x.pdf`)));
    await check("metadata: ukuran > 50 MB ditolak", () => rejects(docRow(pathFor(a.id), { size_bytes: MAX_BYTES + 1 })));
    await check("metadata: ekstensi html ditolak", () => rejects(docRow(pathFor(a.id, "lainnya", "html"), { extension: "html" })));
    await check("metadata: created_at tidak bisa dipalsukan", () =>
      rejects(docRow(pathFor(a.id), { created_at: "2000-01-01T00:00:00Z" })),
    );

    await check("pemilik: update nama & versi, updated_at ikut berubah", async () => {
      const { data, error } = await a.client
        .from("documents")
        .update({ name: "Uji Akses v2.pdf", version: 2 })
        .eq("id", docId)
        .select()
        .single();
      if (error) throw error;
      return data.name === "Uji Akses v2.pdf" && data.version === 2 && data.updated_at > data.created_at;
    });
    await check("pemilik: tidak bisa memindah kepemilikan", async () => {
      const { error } = await a.client.from("documents").update({ owner_id: b.id }).eq("id", docId);
      return Boolean(error);
    });

    const aStillSees = async () => {
      const { data } = await a.client.from("documents").select("name").eq("id", docId).single();
      return data?.name === "Uji Akses v2.pdf";
    };
    await check("user lain: tidak melihat file pemilik", async () => {
      const { data } = await b.client.from("documents").select("id");
      return data?.length === 0;
    });
    await check("user lain: tidak bisa mengubah metadata pemilik", async () => {
      await b.client.from("documents").update({ name: "diretas.pdf" }).eq("id", docId);
      return aStillSees();
    });
    await check("user lain: tidak bisa menghapus metadata pemilik", async () => {
      await b.client.from("documents").delete().eq("id", docId);
      return aStillSees();
    });
    await check("user lain: tidak bisa mengunduh file pemilik", async () => {
      const { error } = await b.client.storage.from(BUCKET).download(pathA);
      return Boolean(error);
    });
    await check("user lain: tidak bisa membuat signed URL file pemilik", async () => {
      const { error } = await b.client.storage.from(BUCKET).createSignedUrl(pathA, 60);
      return Boolean(error);
    });
    await check("user lain: tidak bisa menghapus file pemilik", async () => {
      await b.client.storage.from(BUCKET).remove([pathA]);
      const { error } = await a.client.storage.from(BUCKET).download(pathA);
      return !error;
    });
    await check("user lain: tidak bisa mengklaim path pemilik", async () => {
      const { error } = await b.client.from("documents").insert(docRow(pathA));
      return Boolean(error);
    });

    await check("pemilik: hapus metadata dan file", async () => {
      const del = await a.client.from("documents").delete().eq("id", docId).select();
      const removed = await a.client.storage.from(BUCKET).remove([pathA]);
      const gone = await a.client.storage.from(BUCKET).download(pathA);
      return del.data?.length === 1 && removed.data?.length === 1 && Boolean(gone.error);
    });
  } finally {
    for (const id of users) await admin.auth.admin.deleteUser(id);
  }
}

// ── Ringkasan ────────────────────────────────────────────────────
for (const [status, name] of results) console.log(`${status === "LULUS" ? "✓" : "✗"} ${name}`);
const failed = results.filter(([status]) => status === "GAGAL").length;
console.log(`\n${results.length - failed}/${results.length} lulus (${mode})`);
process.exit(failed ? 1 : 0);
