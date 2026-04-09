import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://facebook-chatbot-rag.onrender.com/api/:path*',
      },
    ]
  }
};

export default nextConfig;
