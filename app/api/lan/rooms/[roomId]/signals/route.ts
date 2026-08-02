import {
  handlePollSignals,
  handlePublishSignal,
} from "@/lib/server/lan-signaling-http"
import { getLanSignalStore } from "@/lib/server/lan-signaling-singleton"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ roomId: string }>
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { roomId } = await context.params
  return handlePollSignals(request, roomId, getLanSignalStore())
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { roomId } = await context.params
  return handlePublishSignal(request, roomId, getLanSignalStore())
}
