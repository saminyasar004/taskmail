import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/tasks/:path*",
        destination: "http://localhost:3001/api/tasks/:path*",
      },
      {
        source: "/api/emails/:path*",
        destination: "http://localhost:3001/api/emails/:path*",
      },
      {
        source: "/api/briefing/:path*",
        destination: "http://localhost:3001/api/briefing/:path*",
      },
      {
        source: "/api/gmail/:path*",
        destination: "http://localhost:3001/api/gmail/:path*",
      },
    ];
  },
};

export default nextConfig;
