/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["logo.clearbit.com"],
  },
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

export default nextConfig;
