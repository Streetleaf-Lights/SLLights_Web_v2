import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides the dev-tools indicator badge. Build/runtime errors still surface.
  devIndicators: false,
};

export default nextConfig;
