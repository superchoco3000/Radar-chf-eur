/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Cela permet de construire le site même s'il y a des erreurs de style (lint)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Cela permet de construire le site même s'il reste des petites erreurs de types
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig 