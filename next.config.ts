/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignore les erreurs de type uniquement pour le build de production
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore aussi les avertissements de style
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;