import { MemoryMatchGame } from "@/features/memory-match/components/memory-match-game"
import { getPageMetadata } from "@/lib/page-metadata"

export default function MemoryMatchPage() {
  return <MemoryMatchGame />
}

export const metadata = getPageMetadata("/memory-match", "zh")
