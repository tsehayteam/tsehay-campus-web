import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: 'www.tsehaycampus.com' },
      { protocol: 'https', hostname: 'tsehaycampus.com' }
    ],
  },
  experimental: {
    optimizePackageImports: ['react-player', '@tailwindcss/postcss'],
  },
  async redirects() {
    return [
      {
        source: '/about-us',
        destination: '/about',
        permanent: true,
      },
      {
        source: '/about_us',
        destination: '/about',
        permanent: true,
      },
      {
        source: '/aboutus',
        destination: '/about',
        permanent: true,
      },
      {
        source: '/silegna',
        destination: '/about',
        permanent: true,
      },
      {
        source: '/sile-egna',
        destination: '/about',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://tsehaycampus-e1a6d.firebaseapp.com/__/auth/:path*',
      },
    ];
  },
};

export default nextConfig;
