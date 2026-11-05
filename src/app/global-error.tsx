"use client";

/** Fallback terakhir bila layout utama gagal. Tidak memakai CSS global, jadi gaya ditulis inline. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#fafafa",
          color: "#171717",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <title>Terjadi kesalahan · Acadocs</title>
        <div>
          <h1 style={{ fontSize: 22, margin: 0 }}>Acadocs sedang bermasalah</h1>
          <p style={{ color: "#666666", marginTop: 8 }}>Muat ulang halaman atau coba lagi sebentar lagi.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 20,
              height: 44,
              padding: "0 20px",
              border: 0,
              borderRadius: 12,
              background: "#f64d9b",
              color: "#171717",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  );
}
