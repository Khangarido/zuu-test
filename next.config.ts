import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle (.next/standalone) for the Docker image.
  // Ignored by Vercel, so the Vercel deployment keeps working unchanged.
  output: "standalone",
  // Version-skew protection: a browser tab opened before a deploy does a full reload on its next
  // navigation instead of failing silently against the new build (links that "do nothing").
  // Set at build time to the image tag / git SHA (Dockerfile ARG DEPLOYMENT_ID); unset elsewhere.
  deploymentId: process.env.DEPLOYMENT_ID || undefined,
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
