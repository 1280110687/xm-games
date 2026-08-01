import { Base64Tool } from "@/components/base64-tool"
import { getPageMetadata } from "@/lib/page-metadata"

export const metadata = getPageMetadata("/base64-tool", "zh")

export default function Base64ToolPage() {
  return <Base64Tool />
}
