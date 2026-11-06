import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Origin Supabase (mis. https://<ref>.supabase.co). Dipakai untuk upload langsung & pratinjau PDF.
const supabaseOrigin = (() => {
  try {
    const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
    return new URL(raw).origin;
  } catch {
    return "";
  }
})();
const isHttps = supabaseOrigin.startsWith("https://");

// CSP tanpa nonce: Partial Prerendering tidak kompatibel dengan nonce (lihat panduan CSP Next 16).
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${supabaseOrigin}`.trim(),
  `media-src 'self' ${supabaseOrigin}`.trim(),
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigin}`.trim(),
  `frame-src 'self' ${supabaseOrigin}`.trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(isHttps ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  ...(isHttps && !isDev
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
