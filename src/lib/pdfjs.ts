let workerReady = false;

/** pdf.js dimuat saat dibutuhkan saja; worker-nya dibuat sekali per halaman browser. */
export async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  if (!workerReady) {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" },
    );
    workerReady = true;
  }
  return pdfjs;
}
