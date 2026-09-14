import { Trophy } from "lucide-react"
import type { FocusViewSlots } from "../shared/focus-view"

/** Paper layout only. The focus exercise owns state, rules and all controls. */
export function SchulteThemeFourView(props: FocusViewSlots) {
  return (
    <main className="schulte-four-stack">
      <article className="schulte-four-stage-card">
        <header className="schulte-four-card-head">
          <div>
            <span>{props.targetLabel}</span>
            <strong>{props.target}</strong>
          </div>
          <div className="schulte-four-time">
            <span>{props.timeLabel}</span>
            <strong>{props.time}</strong>
          </div>
        </header>
        {props.board}
        {props.progress}
      </article>
      <div className="schulte-four-control-dock">
        {props.difficulty}
        {props.actions}
        <div className="schulte-four-best">
          <Trophy aria-hidden="true" />
          <span>{props.bestLabel}</span>
          <strong>{props.best}</strong>
        </div>
      </div>
      {props.notice}
      {props.recentResults}
    </main>
  )
}
