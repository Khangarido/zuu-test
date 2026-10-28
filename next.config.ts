import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle (.next/standalone) for the Docker image.
  // Ignored by Vercel, so the Vercel deployment keeps working unchanged.
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        // Disable proxy buffering so streamed/Suspense responses reach the
        // browser incrementally when nginx sits in front.
        // See node_modules/next/dist/docs/01-app/02-guides/self-hosting.md
        source: "/:path*{/}?",
        headers: [{ key: "X-Accel-Buffering", value: "no" }],
      },
    ];
  },
};

export default nextConfig;
