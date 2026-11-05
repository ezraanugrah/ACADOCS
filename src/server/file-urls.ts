import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOwner } from "@/server/auth";
import { getDocument } from "@/server/queries";

const TTL = { view: 600, download: 60 } as const;

/**
 * Cek pemilik di server, lalu redirect ke signed URL berumur pendek.
 * Signed URL tidak pernah ditanam di HTML; setiap klik membuat URL baru.
 */
export async function redirectToFile(request: NextRequest, id: string, mode: keyof typeof TTL) {
  const owner = await getOwner();
  if (!owner) return NextResponse.redirect(new URL("/login", request.url));

  const doc = await getDocument(id);
  if (!doc) return new NextResponse("Dokumen tidak ditemukan.", { status: 404 });

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.storage_path, TTL[mode], mode === "download" ? { download: doc.name } : undefined);
  if (error) return new NextResponse("File tidak tersedia. Coba lagi.", { status: 502 });

  const response = NextResponse.redirect(data.signedUrl, 302);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
