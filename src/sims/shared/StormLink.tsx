import { useUi } from '../../store/ui'

/** Header control: shows whether this simulator follows "your storm". */
export function StormLink({ linked, setLinked }: { linked: boolean; setLinked: (on: boolean) => void }) {
  const open = useUi((s) => s.setStormOpen)
  return (
    <span className="sim-link">
      <button
        type="button"
        aria-pressed={linked}
        onClick={() => setLinked(!linked)}
        title={
          linked ? 'This simulator uses your shared storm — click to experiment privately' : 'Follow your shared storm'
        }
      >
        {linked ? '⛓ linked to your storm' : 'use my storm'}
      </button>
      {linked && (
        <button type="button" onClick={() => open(true)} aria-label="Open your storm">
          edit
        </button>
      )}
    </span>
  )
}
