import { ChessGame } from "@/components/chess-game"
import { getPageMetadata } from "@/lib/page-metadata"

export const metadata = getPageMetadata("/chess", "zh")

export default function ChessPage() {
  return <ChessGame />
}
