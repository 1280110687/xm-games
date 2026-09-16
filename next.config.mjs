import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants.js'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The draggable Next.js development indicator can conflict with fixed
  // mobile navigation and throw releasePointerCapture errors during interaction.
  // Runtime and build errors still use the normal Next.js error overlay.
  devIndicators: false,
  async rewrites() {
    if (process.env.XM_EXPERIENCE_DEV !== "1") return []
    return {
      beforeFiles: [
        {
          source: "/theme-four-experience/elemental-arena/:path*",
          destination: "http://127.0.0.1:4175/theme-four-experience/elemental-arena/:path*",
        },
        {
          source: "/theme-four-experience/:path*",
          destination: "http://127.0.0.1:4174/theme-four-experience/:path*",
        },
      ],
    }
  },
}

export default async function configureNext(phase) {
  // Production servers serve the assets generated at build time. Do not require
  // build-only dependencies or a writable public directory in `next start`.
  if (phase === PHASE_DEVELOPMENT_SERVER || phase === PHASE_PRODUCTION_BUILD) {
    const { buildThemeAssets } = await import('./scripts/build-theme-assets.mjs')
    await buildThemeAssets()
  }
  return nextConfig
}
