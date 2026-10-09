import type { NextConfig } from 'next';
const config: NextConfig = {
  serverExternalPackages: ['libsodium-wrappers-sumo'],
  outputFileTracingExcludes: {
    '/*': ['./.data/**/*', './.env*', './anchor/**/*', './tests/**/*', './scripts/**/*'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};
export default config;
