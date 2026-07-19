import { SnakeGame } from "@/components/snake-game"
import { getPageMetadata } from "@/lib/page-metadata"

export const metadata = getPageMetadata("/snake", "zh")

export default function SnakePage() {
  return <SnakeGame />
}
