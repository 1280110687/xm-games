import { AlternatingTrailGame } from "@/features/alternating-trail/components/alternating-trail-game"
import { getPageMetadata } from "@/lib/page-metadata"
import "../schulte-grid.css"
import "@/styles/themes/theme-one/schulte-grid.css"
import "@/styles/themes/theme-two/schulte-grid.css"
import "@/styles/themes/theme-three/schulte-grid.css"
import "@/styles/themes/theme-four/schulte-grid.css"

export default function AlternatingTrailPage() {
  return <AlternatingTrailGame />
}

export const metadata = getPageMetadata("/alternating-trail", "zh")
