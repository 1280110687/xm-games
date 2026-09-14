import type { FocusViewSlots } from "../shared/focus-view"

// Presentation slots only: neither this view nor its stylesheet owns the exercise engine.
export function ArcadeSchulteView(props: FocusViewSlots) {
  return <main className="arcade-focus">
    <section className="arcade-focus-stage">
      <div className="arcade-focus-scoreboard">
        <div><span>{props.targetLabel}</span><strong>{props.target}</strong></div>
        <div><span>{props.timeLabel}</span><strong>{props.time}</strong></div>
      </div>
      {props.board}
      {props.progress}
    </section>
    <aside className="arcade-focus-controls">
      {props.difficulty}
      {props.actions}
      {props.notice}
      <div className="arcade-focus-best"><span>{props.bestLabel}</span><strong>{props.best}</strong></div>
    </aside>
    {props.recentResults}
  </main>
}
