import { TextTool } from "@/features/tools/components/text-tool"
import { getPageMetadata } from "@/lib/page-metadata"

export const metadata = getPageMetadata("/text-tool", "zh")

export default function TextToolPage() {
  return <TextTool />
}
