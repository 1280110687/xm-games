import { ImmersiveGame } from "@/features/immersive-games/immersive-game"
import { getPageMetadata } from "@/lib/page-metadata"
export default function PinballSchminballPage() { return <ImmersiveGame gameId="pinball-schminball" /> }
export const metadata = getPageMetadata("/pinball-schminball", "zh")
