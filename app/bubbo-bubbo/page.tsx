import { ImmersiveGame } from "@/features/immersive-games/immersive-game"
import { getPageMetadata } from "@/lib/page-metadata"
export default function BubboBubboPage() { return <ImmersiveGame gameId="bubbo-bubbo" /> }
export const metadata = getPageMetadata("/bubbo-bubbo", "zh")
