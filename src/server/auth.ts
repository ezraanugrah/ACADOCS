import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getOwnerId } from "@/lib/owner";
import { createClient } from "@/lib/supabase/server";

export type Owner = { id: string; email: string };

/**
 * Pemeriksaan otoritatif: sesi divalidasi ke server Auth (getUser, jadi sesi yang
 * sudah logout ikut ditolak) lalu dicocokkan dengan owner ID. Sekali per request.
 */
export const getOwner = cache(async (): Promise<Owner | null> => {
  // Selalu per request: jangan ikut di-prerender/prefetch sebagai App Shell.
  await connection();
  const ownerId = getOwnerId();
  if (!ownerId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.id.toLowerCase() !== ownerId) return null;

  return { id: data.user.id, email: data.user.email ?? "" };
});

/** Wajib dipanggil di setiap halaman workspace dan Server Action yang menyentuh data. */
export async function requireOwner() {
  const owner = await getOwner();
  if (!owner) redirect("/login");
  return owner;
}
