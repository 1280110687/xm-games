import { GoGame } from "@/components/go-game"
import { getPageMetadata } from "@/lib/page-metadata"

export const metadata = getPageMetadata("/go", "zh")

export default function GoPage() {
  return <GoGame />
}
