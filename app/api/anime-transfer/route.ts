import { handleAnimeTransfer } from "@/lib/server/anime-transfer-http"
import { getAnimeTransferStore } from "@/lib/server/anime-transfer-singleton"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request): Promise<Response> {
  return handleAnimeTransfer(request, getAnimeTransferStore())
}
