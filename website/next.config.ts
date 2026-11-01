import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
  reactStrictMode: true,
  experimental: {
    agentUpgrade: 'security',
  },
};

export default nextConfig;
