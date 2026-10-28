import { ImmersiveGame } from "@/features/immersive-games/immersive-game"
import { getPageMetadata } from "@/lib/page-metadata"
export default function PuzzlingPotionsPage() { return <ImmersiveGame gameId="puzzling-potions" /> }
export const metadata = getPageMetadata("/puzzling-potions", "zh")
