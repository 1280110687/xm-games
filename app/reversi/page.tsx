import { ReversiGame } from "@/components/reversi-game"
import { getPageMetadata } from "@/lib/page-metadata"

export default function ReversiPage() {
  return <ReversiGame />
}

export const metadata = getPageMetadata("/reversi", "zh")
