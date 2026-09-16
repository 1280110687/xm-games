import { pocketArtSrcSet } from "./art"

export function PocketArt({ name, sizes, eager = false, critical = false, className }: {
  name: string
  sizes: string
  eager?: boolean
  critical?: boolean
  className?: string
}) {
  // Prebuilt responsive files are portable across hosts and can all be precached.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={`/images/theme-pocket/${name}.webp`}
    srcSet={pocketArtSrcSet(name)} sizes={sizes} alt="" width={320} height={320}
    loading={eager || critical ? "eager" : "lazy"} fetchPriority={critical ? "high" : "auto"} decoding="async" />
}
