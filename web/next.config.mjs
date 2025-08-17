/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  output: 'export',
  // GitHub Pages などサブパス公開時のプレフィックス
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
}

export default nextConfig
