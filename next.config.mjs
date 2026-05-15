/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.BASEPATH,
  eslint: {
    ignoreDuringBuilds: true
  },
  async rewrites() {
    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '';
    return [
      {
        source: '/api/backend/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: true,
        locale: false
      }
    ]
  }
}

export default nextConfig
