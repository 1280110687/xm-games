import { BilliardsGame } from "@/features/billiards/components/billiards-game"
import { getPageMetadata } from "@/lib/page-metadata"

export default function BilliardsPage() { return <BilliardsGame /> }

export const metadata = getPageMetadata("/billiards", "zh")
