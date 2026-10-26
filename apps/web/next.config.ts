import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Le web et l'API partagent la même origine publique : le navigateur appelle
  // /api/* et Next relaie vers l'API interne. Les cookies httpOnly restent
  // first-party et aucune requête CORS n'est nécessaire.
  async rewrites() {
    const apiUrl = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4100';
    return [{ source: '/api/:path*', destination: `${apiUrl}/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
