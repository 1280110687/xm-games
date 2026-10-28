import { ImmersiveGame } from "@/features/immersive-games/immersive-game"
import { getPageMetadata } from "@/lib/page-metadata"
export default function DeepFieldPage() { return <ImmersiveGame gameId="deep-field" /> }
export const metadata = getPageMetadata("/deep-field", "zh")
