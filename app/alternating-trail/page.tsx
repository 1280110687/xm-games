import { AlternatingTrailGame } from "@/components/alternating-trail-game"
import { getPageMetadata } from "@/lib/page-metadata"
import "../schulte-grid.css"
import "../theme-one-schulte-grid.css"
import "../theme-two-schulte-grid.css"
import "../theme-three-schulte-grid.css"
import "../theme-four-schulte-grid.css"

export default function AlternatingTrailPage() {
  return <AlternatingTrailGame />
}

export const metadata = getPageMetadata("/alternating-trail", "zh")
