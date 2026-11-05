/**
 * Kirim file langsung dari browser ke Supabase Storage lewat signed upload URL.
 * File tidak melewati server Next.js/Vercel. MIME diambil dari ekstensi (bukan dari browser).
 */
export function putToSignedUrl(
  signedUrl: string,
  file: Blob,
  mime: string,
  onProgress: (fraction: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("content-type", mime);
    xhr.setRequestHeader("x-upsert", "false");
    // Publishable key bersifat publik; signed URL-lah yang memberi izin upload.
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      reject(new Error(uploadErrorMessage(xhr.status, xhr.responseText)));
    };
    xhr.onerror = () => reject(new Error("Koneksi terputus. Periksa internet lalu coba lagi."));
    xhr.send(file);
  });
}

function uploadErrorMessage(status: number, body: string) {
  let code = "";
  try {
    const parsed = JSON.parse(body) as { statusCode?: string; error?: string };
    code = `${parsed.statusCode ?? ""} ${parsed.error ?? ""}`;
  } catch {
    // body bukan JSON
  }
  if (status === 413 || code.includes("413")) return "Ukuran file melebihi batas 50 MB.";
  if (code.includes("415") || code.includes("mime")) return "Tipe file ditolak oleh penyimpanan.";
  if (status === 409 || code.includes("409")) return "File dengan lokasi sama sudah ada.";
  if (status === 401 || status === 403) return "Izin upload kedaluwarsa. Coba lagi.";
  return "Upload gagal. Coba lagi.";
}
