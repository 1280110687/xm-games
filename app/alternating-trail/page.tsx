import { AlternatingTrailGame } from "@/components/alternating-trail-game"
import { getPageMetadata } from "@/lib/page-metadata"

export default function AlternatingTrailPage() {
  return <AlternatingTrailGame />
}

export const metadata = getPageMetadata("/alternating-trail", "zh")
