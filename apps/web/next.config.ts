import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Research content is served by the Python corpus API, outside the web bundle.
  serverExternalPackages: [],
};

export default nextConfig;
