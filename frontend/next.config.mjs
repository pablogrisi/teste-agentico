/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // O lint roda pelo ESLint CLI (`npm run lint` → `eslint .`), encadeado no `npm run ci`.
    // `next build` não repete o lint (o `next lint` interno está deprecado no Next 15).
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
