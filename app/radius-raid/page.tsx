import { ImmersiveGame } from "@/features/immersive-games/immersive-game"
import { getPageMetadata } from "@/lib/page-metadata"
export default function RadiusRaidPage() { return <ImmersiveGame gameId="radius-raid" /> }
export const metadata = getPageMetadata("/radius-raid", "zh")
