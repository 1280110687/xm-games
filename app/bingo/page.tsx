import { BingoGame } from "@/components/bingo-game"
import { getPageMetadata } from "@/lib/page-metadata"

export const metadata = getPageMetadata("/bingo", "zh")

export default function BingoPage() {
  return <BingoGame />
}
