import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The corpus catalog and PDFs are read from the repo's data/ directory at
  // runtime by server routes; keep the Node runtime and no bundling of them.
  serverExternalPackages: [],
};

export default nextConfig;
