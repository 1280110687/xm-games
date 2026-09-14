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

export default nextConfig
