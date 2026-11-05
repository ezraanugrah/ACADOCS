import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Acadocs", template: "%s · Acadocs" },
  description: "Ruang kerja pribadi untuk dokumen skripsi.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#fafafa",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full`}>
      <body className="min-h-full font-sans text-body antialiased">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{ className: "!rounded-2xl !border-line !font-sans !text-ink !shadow-card" }}
        />
      </body>
    </html>
  );
}
