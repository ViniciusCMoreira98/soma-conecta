/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: "55mb" } },
  images: { remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }] },
};
export default nextConfig;
