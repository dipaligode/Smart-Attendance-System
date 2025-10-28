/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Important: do NOT use "distDir" or "output" here for Vercel
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
