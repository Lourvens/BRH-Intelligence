import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Separate build artifacts when verifying against an isolated local backend.
  distDir: process.env.BRH_WEB_TEST_BUILD === "true" ? ".next-tests" : ".next",
  // Research content is served by the Python corpus API, outside the web bundle.
  serverExternalPackages: [],
};

export default nextConfig;
