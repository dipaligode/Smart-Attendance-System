/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Optional: disables image optimization if you’re not using the <Image> component
  images: {
    unoptimized: true,
  },

  // Remove all experimental flags — Next 16 auto-uses Turbopack
};

module.exports = nextConfig;
