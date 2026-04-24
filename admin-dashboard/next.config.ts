import type { NextConfig } from "next";

const backendUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");


const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd()
  },
  async rewrites() {
    return [
      // Dedicated keep-alive health proxy (routes BEFORE the generic /api/* catch-all)
      {
        source: '/api/proxy/health',
        destination: `${backendUrl}/health`,
      },
      // Generic backend proxy
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  }
};

export default nextConfig;
