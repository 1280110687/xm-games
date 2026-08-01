import { QrCodeTool } from "@/components/qr-code-tool"
import { getPageMetadata } from "@/lib/page-metadata"

export const metadata = getPageMetadata("/qr-code", "zh")

export default function QrCodePage() {
  return <QrCodeTool />
}
