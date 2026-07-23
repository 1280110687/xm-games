/** @type {import('next').NextConfig} */
const nextConfig = {
  // The draggable Next.js development indicator can conflict with Theme Two's
  // mobile navigation and throw releasePointerCapture errors during interaction.
  // Runtime and build errors still use the normal Next.js error overlay.
  devIndicators: false,
}

export default nextConfig
