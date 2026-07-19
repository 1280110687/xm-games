import { ChineseChessGame } from "@/components/chinese-chess-game"
import { getPageMetadata } from "@/lib/page-metadata"

export const metadata = getPageMetadata("/chinese-chess", "zh")

export default function ChineseChessPage() {
  return <ChineseChessGame />
}
