import type { NextConfig } from 'next'
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants'

const nextConfig = (phase: string): NextConfig => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER

  return {
    ...(isDev ? {} : { output: 'standalone' as const }),
    turbopack: {
      root: __dirname,
    },
    // pdf-parse usa pdfjs-dist que chama Object.defineProperty de forma incompatível
    // com o bundler do webpack. Marcar como externos faz o Next.js usar o require()
    // nativo do Node.js em vez de tentar empacotar esses módulos.
    serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  }
}

export default nextConfig
