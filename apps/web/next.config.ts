import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@heckle/shared"],
  // 0G storage SDK is only imported in Node route handlers (runtime = "nodejs").
  serverExternalPackages: ["@0gfoundation/0g-storage-ts-sdk"],
};

export default nextConfig;
