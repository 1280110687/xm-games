import { BingoCards } from "@/components/bingo-cards"
import { getPageMetadata } from "@/lib/page-metadata"

export const metadata = getPageMetadata("/bingo-cards", "zh")

export default function BingoCardsPage() {
  return <BingoCards />
}
