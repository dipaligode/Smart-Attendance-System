/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ✅ remove static export options
  // (Vercel needs server output, not standalone or 'out')
  images: {
    unoptimized: true, // optional
  },

  // ✅ enable experimental turbo safely
  experimental: {
    turbo: {
      rules: {},
    },
  },
};

module.exports = nextConfig;
