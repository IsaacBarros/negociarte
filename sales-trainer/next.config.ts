import type { NextConfig } from 'next'
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants'

const nextConfig = (phase: string): NextConfig => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER

  return {
    ...(isDev ? { distDir: '.next-dev' } : { output: 'standalone' as const }),
  }
}

export default nextConfig
