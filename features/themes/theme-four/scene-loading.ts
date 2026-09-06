export const SCENE_START_TIMEOUT_MS = 45_000
export type SceneLoadState = {
  phase: "starting" | "booted" | "ready" | "failed"
  attempt: number
  failure?: "timeout" | "runtime"
}
export type SceneLoadAction = "booted" | "ready" | "failed" | "timeout" | "retry"
export const INITIAL_SCENE_LOAD: SceneLoadState = { phase: "starting", attempt: 0 }

export function sceneLoadReducer(state: SceneLoadState, action: SceneLoadAction): SceneLoadState {
  if (action === "retry") return { phase: "starting", attempt: state.attempt + 1 }
  if (state.failure === "runtime") return state
  if (action === "failed") return { ...state, phase: "failed", failure: "runtime" }
  if (action === "timeout") return state.phase === "ready" ? state : { ...state, phase: "failed", failure: "timeout" }
  // A delayed boot acknowledgement cannot hide a failure or regress readiness.
  if (action === "booted" && state.phase !== "starting") return state
  // A slow but ultimately successful scene may recover after the timeout.
  return { attempt: state.attempt, phase: action }
}
