import type { FocusViewSlots } from "../shared/focus-view"

export function PocketSchulteView(props: FocusViewSlots) {
  return <main className="pocket-focus">
    <section className="pocket-focus-play">
      <div className="pocket-focus-score"><div><span>{props.targetLabel}</span><strong>{props.target}</strong></div><div><span>{props.timeLabel}</span><strong>{props.time}</strong></div></div>
      {props.board}{props.progress}
    </section>
    <aside className="pocket-focus-options">{props.difficulty}{props.actions}{props.notice}
      <div className="pocket-focus-best"><span>{props.bestLabel}</span><strong>{props.best}</strong></div>
    </aside>
    {props.recentResults}
  </main>
}
