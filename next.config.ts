import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export as static HTML for Firebase Hosting
output: "standalone",

  // Output build files to /out folder
  distDir: "out",

  // Disable image optimization (required for static export)
  images: {
    unoptimized: true,
  },

  // Keep TypeScript strictness
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
