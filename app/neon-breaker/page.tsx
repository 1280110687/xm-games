import { NeonBreakerGame } from "@/features/neon-breaker/components/neon-breaker-game"
import { getPageMetadata } from "@/lib/page-metadata"

export default function NeonBreakerPage() {
  return <NeonBreakerGame />
}

export const metadata = getPageMetadata("/neon-breaker", "zh")
