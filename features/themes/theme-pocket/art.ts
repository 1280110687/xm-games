export const POCKET_GAME_SIZES = "(min-width: 920px) 123px, (min-width: 700px) calc((100vw - 184px) / 6), (max-width: 359px) calc((100vw - 52px) / 3), calc((100vw - 72px) / 3)"
// Include the visual scale used by the document illustration, not only its box.
export const POCKET_DOCUMENT_SIZES = "(max-width: 359px) 97px, 126px"

export function pocketArtSrcSet(name: string): string {
  const widths = name === "documents" ? [96, 160, 240, 256] : [96, 160, 240]
  return widths.map(width => `/images/theme-pocket/responsive/${name}-${width}.webp ${width}w`)
    .concat(`/images/theme-pocket/${name}.webp 320w`).join(", ")
}
