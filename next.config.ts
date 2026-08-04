import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/__/auth/handler',
        destination: 'https://tsehaycampus-e1a6d.firebaseapp.com/__/auth/handler',
      },
    ];
  },
};

export default nextConfig;
