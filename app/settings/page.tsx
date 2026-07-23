import { SettingsPage } from "@/components/settings-page"
import { getPageMetadata } from "@/lib/page-metadata"

export const metadata = getPageMetadata("/settings", "zh")

export default function SettingsRoute() {
  return <SettingsPage />
}
