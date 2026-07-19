import { AnimeTracker } from "@/components/anime-tracker"
import { getPageMetadata } from "@/lib/page-metadata"

export const metadata = getPageMetadata("/anime-tracker", "zh")

export default function AnimeTrackerPage() {
  return <AnimeTracker />
}
