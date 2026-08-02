import { handleLeaveRoom } from "@/lib/server/lan-signaling-http"
import { getLanSignalStore } from "@/lib/server/lan-signaling-singleton"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ roomId: string }>
}

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { roomId } = await context.params
  return handleLeaveRoom(request, roomId, getLanSignalStore())
}
