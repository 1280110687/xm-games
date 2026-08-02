import { handleCreateRoom } from "@/lib/server/lan-signaling-http"
import { getLanSignalStore } from "@/lib/server/lan-signaling-singleton"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request): Promise<Response> {
  return handleCreateRoom(request, getLanSignalStore())
}
