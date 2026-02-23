import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // reactCompiler: true, // 暂时禁用，存在 hooks 兼容性问题
  async redirects() {
    return [
      {
        source: '/labour',
        destination: '/behavior-interview',
        permanent: false,
      },
      {
        source: '/labour/:path*',
        destination: '/behavior-interview/:path*',
        permanent: false,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  }
};

export default nextConfig;
