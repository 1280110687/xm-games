import { GomokuGame } from "@/features/gomoku/components/gomoku-game"
import { getPageMetadata } from "@/lib/page-metadata"

export default function GomokuPage() {
  return <GomokuGame />
}

export const metadata = getPageMetadata("/gomoku", "zh")
