import { SchulteGridGame } from "@/features/schulte-grid/components/schulte-grid-game"
import { getPageMetadata } from "@/lib/page-metadata"
import "../schulte-grid.css"
import "@/styles/themes/theme-one/schulte-grid.css"
import "@/styles/themes/theme-two/schulte-grid.css"
import "@/styles/themes/theme-three/schulte-grid.css"
import "@/styles/themes/theme-four/schulte-grid.css"

export default function SchulteGridPage() {
  return <SchulteGridGame />
}

export const metadata = getPageMetadata("/schulte-grid", "zh")
