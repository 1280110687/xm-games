import { SchulteGridGame } from "@/components/schulte-grid-game"
import { getPageMetadata } from "@/lib/page-metadata"
import "../schulte-grid.css"
import "../theme-one-schulte-grid.css"
import "../theme-two-schulte-grid.css"
import "../theme-three-schulte-grid.css"
import "../theme-four-schulte-grid.css"

export default function SchulteGridPage() {
  return <SchulteGridGame />
}

export const metadata = getPageMetadata("/schulte-grid", "zh")
