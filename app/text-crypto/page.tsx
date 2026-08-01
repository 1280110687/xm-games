import { TextCryptoTool } from "@/components/text-crypto-tool"
import { getPageMetadata } from "@/lib/page-metadata"

export const metadata = getPageMetadata("/text-crypto", "zh")

export default function TextCryptoPage() {
  return <TextCryptoTool />
}
