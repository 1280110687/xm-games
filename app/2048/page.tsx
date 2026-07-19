import { Game2048 } from "@/components/game-2048"
import { getPageMetadata } from "@/lib/page-metadata"

export default function Game2048Page() {
  return <Game2048 />
}

export const metadata = getPageMetadata("/2048", "zh")
