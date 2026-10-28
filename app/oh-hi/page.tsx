import { OhHiGame } from "@/features/oh-hi/components/oh-hi-game"
import { getPageMetadata } from "@/lib/page-metadata"

export default function OhHiPage() {
  return <OhHiGame />
}

export const metadata = getPageMetadata("/oh-hi", "zh")
