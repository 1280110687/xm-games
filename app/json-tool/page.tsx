import { JsonTool } from "@/components/json-tool"
import { getPageMetadata } from "@/lib/page-metadata"

export const metadata = getPageMetadata("/json-tool", "zh")

export default function JsonToolPage() {
  return <JsonTool />
}
