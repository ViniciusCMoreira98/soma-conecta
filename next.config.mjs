/**
 * Cabeçalhos de segurança aplicados a todas as respostas.
 * - frame-ancestors / X-Frame-Options: impede que o app seja exibido dentro de outro site (clickjacking).
 * - Permissions-Policy: libera só a geolocalização (busca por proximidade); câmera/microfone ficam bloqueados.
 * Obs.: não há "form-action" no CSP porque o login com Google redireciona o envio do formulário para domínios externos.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }] },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Service worker do PWA: sempre buscar a versão mais nova.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
};
export default nextConfig;
