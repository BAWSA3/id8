import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* the dev badge would land in every film take; the desk has its own chrome */
  devIndicators: false,
  /* hardening headers. HSTS comes from Vercel. No CSP yet: X's widgets and the
     analytics script would need an allowlist, and a wrong one breaks the wall. */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
