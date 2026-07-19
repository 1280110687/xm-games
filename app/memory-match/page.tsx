import { MemoryMatchGame } from "@/components/memory-match-game"
import { getPageMetadata } from "@/lib/page-metadata"

export default function MemoryMatchPage() {
  return <MemoryMatchGame />
}

export const metadata = getPageMetadata("/memory-match", "zh")
