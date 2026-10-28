import { ImmersiveGame } from "@/features/immersive-games/immersive-game"
import { getPageMetadata } from "@/lib/page-metadata"
export default function GalagaPage() { return <ImmersiveGame gameId="galaga" /> }
export const metadata = getPageMetadata("/galaga", "zh")
