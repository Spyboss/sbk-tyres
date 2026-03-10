const withCloudflare = require('@cloudflare/next-on-pages')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
}

module.exports = withCloudflare(nextConfig)
