import { handleHeartbeat } from "@/lib/server/lan-signaling-http"
import { getLanSignalStore } from "@/lib/server/lan-signaling-singleton"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ roomId: string }>
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { roomId } = await context.params
  return handleHeartbeat(request, roomId, getLanSignalStore())
}
