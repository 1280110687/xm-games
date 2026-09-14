import type { ReactNode } from "react"

export type FocusViewSlots = {
  targetLabel: string
  target: ReactNode
  timeLabel: string
  time: string
  bestLabel: string
  best: string
  board: ReactNode
  progress: ReactNode
  difficulty: ReactNode
  actions: ReactNode
  notice: ReactNode
  recentResults: ReactNode
}
