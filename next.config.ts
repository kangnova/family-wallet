import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server's client-side resources (HMR, runtime chunks) to be
  // fetched when the app is accessed via the server's public IP instead of
  // localhost. See: https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: ["43.156.225.212"],
};

export default nextConfig;
