import type { NextConfig } from "next";

const securityHeaders = [
  // Complementa `robots` de src/app/layout.tsx: cubre también fuentes, imágenes
  // y demás ficheros que no son HTML. No añadir Disallow en robots.txt.
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // same-origin-allow-popups: aísla la ventana sin romper los popups OAuth de Clerk.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  // CSP en Report-Only: registra violaciones sin bloquear. Antes de pasar a
  // enforcing hay que ajustar el host de Clerk al dominio de producción y
  // revisar los reports (ver docs/security.md).
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://challenges.cloudflare.com https://va.vercel-scripts.com",
      "connect-src 'self' https://*.clerk.accounts.dev https://*.convex.cloud wss://*.convex.cloud",
      "img-src 'self' data: https://api.dicebear.com https://img.clerk.com https://images.pexels.com https://cdn.brandfetch.io",
      "style-src 'self' 'unsafe-inline'",
      "frame-src https://challenges.cloudflare.com",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [{ source: "/dashboard", destination: "/agenda", permanent: true }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
