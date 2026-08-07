import { SchulteGridGame } from "@/components/schulte-grid-game"
import { getPageMetadata } from "@/lib/page-metadata"

export default function SchulteGridPage() {
  return <SchulteGridGame />
}

export const metadata = getPageMetadata("/schulte-grid", "zh")
