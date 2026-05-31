import type { NextConfig } from 'next'
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants'

const nextConfig = (phase: string): NextConfig => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER

  return {
    ...(isDev ? {} : { output: 'standalone' as const }),
    turbopack: {
      root: __dirname,
    },
    // pdfjs-dist usa Object.defineProperty incompatível com bundlers.
    // Marcar como externo força o Node.js nativo em vez de empacotar.
    serverExternalPackages: ['pdfjs-dist'],
  }
}

export default nextConfig
