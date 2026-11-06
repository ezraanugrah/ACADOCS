"use server";

import { redirect } from "next/navigation";
import { getOwnerId } from "@/lib/owner";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type SignInState = { error: string | null; email: string };

const MESSAGES = {
  email: "Masukkan alamat email yang valid.",
  password: "Masukkan password kamu.",
  invalid: "Email atau password salah.",
  rateLimited: "Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.",
  forbidden: "Akun ini tidak punya akses ke Acadocs.",
  config: "Login belum bisa dipakai karena konfigurasi server belum lengkap.",
  badKey: "Login belum bisa dipakai karena konfigurasi server tidak valid.",
  unavailable: "Layanan login sedang bermasalah. Coba lagi sebentar lagi.",
};

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: MESSAGES.email, email };
  }
  if (!password || password.length > 256) return { error: MESSAGES.password, email };

  const ownerId = getOwnerId();
  if (!ownerId || !hasSupabaseEnv()) return { error: MESSAGES.config, email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Hanya status & kode yang dicatat (tanpa email/password) agar bisa dilacak di log server.
    console.warn("[acadocs] login gagal", { status: error.status, code: error.code });
    // Key Supabase ditolak = salah konfigurasi server, bukan salah password.
    if (error.status === 401 || /api key/i.test(error.message)) return { error: MESSAGES.badKey, email };
    // Pesan sengaja umum: tidak membedakan email tak dikenal vs password salah.
    if (error.status === 429 || error.code === "over_request_rate_limit") {
      return { error: MESSAGES.rateLimited, email };
    }
    if (!error.status || error.status >= 500) return { error: MESSAGES.unavailable, email };
    return { error: MESSAGES.invalid, email };
  }

  if (data.user?.id.toLowerCase() !== ownerId) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: MESSAGES.forbidden, email };
  }

  redirect("/dashboard");
}

/** Logout: sesi dicabut di server Auth (bukan hanya cookie dihapus). */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?keluar=1");
}
