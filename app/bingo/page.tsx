import { BingoGame } from "@/features/bingo/components/bingo-game"
import { getPageMetadata } from "@/lib/page-metadata"
import "@/styles/games/bingo-workspace.css"

export const metadata = getPageMetadata("/bingo", "zh")

export default function BingoPage() {
  return <BingoGame />
}
