# Acadocs

Ruang kerja pribadi untuk dokumen skripsi per BAB. Satu pemilik, tanpa registrasi publik.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS v4 · Supabase (Auth, Postgres + RLS, Storage privat).

## Fitur

- Login email + password khusus pemilik (dicek dengan `ACADOCS_OWNER_ID` di server).
- 7 kategori tetap, termasuk Abstract & BAB 1–5 serta dua folder jurnal.
- Upload banyak file sekaligus langsung dari browser ke Storage (signed upload URL), maks. 50 MB per file.
- Pratinjau PDF, download dengan nama asli, ganti file (versi naik, file lama dihapus setelah yang baru berhasil), hapus dengan konfirmasi.
- Pencarian nama file lintas folder.

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local   # isi URL, publishable key, dan ACADOCS_OWNER_ID
npm run dev
```

| Variabel | Keterangan |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`), aman di browser karena RLS |
| `ACADOCS_OWNER_ID` | User UID pemilik. Hanya server; tanpa nilai ini semua akses ditolak |

Jangan pernah menambahkan secret / service_role key ke project ini.

### Supabase lokal (untuk pengujian)

Butuh Docker dan Supabase CLI.

```bash
supabase start                 # menerapkan supabase/migrations
npm run seed:local             # 11 dokumen contoh untuk akun uji lokal
npm run dev:local              # app di http://localhost:3100 memakai Supabase lokal
```

`dev:local` tidak menyentuh `.env.local`. Akun uji lokal didefinisikan di `scripts/local-supabase.mjs` dan hanya ada di stack lokal.

## Skrip

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan (Supabase dari `.env.local`) |
| `npm run dev:local` | Server pengembangan dengan Supabase lokal (`-- --prod` untuk build + start) |
| `npm run seed:local` | Isi Supabase lokal dengan dokumen contoh |
| `npm run lint` / `npm run typecheck` / `npm run build` | Pemeriksaan kualitas |
| `node scripts/verify-access.mjs local` | Uji RLS & Storage lengkap di Supabase lokal |
| `node scripts/verify-access.mjs remote` | Uji akses anonim ke project remote (semua harus ditolak) |
| `node scripts/verify-access.mjs owner` | Uji login & akses pemilik di remote (password diketik, tidak ditampilkan) |

## Database

Migrasi ada di `supabase/migrations`: tabel `documents` dengan RLS per pemilik, kolom yang boleh diubah dibatasi, serta bucket privat `documents` (50 MB, daftar MIME terbatas, objek tidak bisa ditimpa).

```bash
supabase link --project-ref <ref>
supabase db push
```

## Deploy (Vercel)

1. Import repository di Vercel.
2. Isi ketiga environment variable di atas (Production & Preview).
3. Region function sudah diset ke `sin1` lewat `vercel.json` agar dekat dengan Supabase Singapore.
4. Di Supabase → Authentication → URL Configuration, isi Site URL dengan domain produksi.
5. Pastikan signup publik dan anonymous sign-in tetap mati.

## Keamanan

- Dokumen hanya ada di bucket Supabase **privat**, tidak di repo, folder `public/`, atau localStorage.
- Sesi disimpan di cookie httpOnly. Akses diverifikasi di proxy, di setiap halaman, dan di setiap Server Action.
- Preview & download memakai signed URL berumur pendek yang dibuat ulang tiap klik.
- Header keamanan (CSP, `nosniff`, `X-Frame-Options`, `noindex`) diset di `next.config.ts`.
