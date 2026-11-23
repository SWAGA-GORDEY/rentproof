import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  output: "standalone",
  poweredByHeader: false,
  images: {
    localPatterns: [{ pathname: "/media/**" }],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  async redirects() {
    // Case-variant aliases (/Admin) must NOT live here: Next can treat them as
    // case-insensitive and loop /admin → /admin. Handle case in proxy.ts instead.
    return [
      { source: "/owner", destination: "/admin", permanent: false },
      { source: "/owner/:path*", destination: "/admin/:path*", permanent: false },
      { source: "/control-center", destination: "/admin", permanent: false },
      { source: "/control-center/:path*", destination: "/admin/:path*", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
