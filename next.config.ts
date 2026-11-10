/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() { return [{ source: "/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "X-Content-Type-Options", value: "nosniff" }] }]; },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "logo.clearbit.com",
      },
      {
        protocol: "https",
        hostname: "**.clearbit.com",
      },
    ],
  },
};

export default nextConfig;
