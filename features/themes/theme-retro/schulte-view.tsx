import type { FocusViewSlots } from "../shared/focus-view"

export function RetroSchulteView(props: FocusViewSlots) {
  return <main className="retro-focus">
    <section className="retro-focus-play">
      <div className="retro-focus-score"><div><span>{props.targetLabel}</span><strong>{props.target}</strong></div><div><span>{props.timeLabel}</span><strong>{props.time}</strong></div></div>
      {props.board}{props.progress}
    </section>
    <aside className="retro-focus-options">{props.difficulty}{props.actions}{props.notice}
      <div className="retro-focus-best"><span>{props.bestLabel}</span><strong>{props.best}</strong></div>
    </aside>{props.recentResults}
  </main>
}
