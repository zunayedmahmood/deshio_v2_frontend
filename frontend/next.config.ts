import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true, // keeps next/image working without optimization
  },
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/e-commerce',
      },
    ];
  },
};

export default nextConfig;