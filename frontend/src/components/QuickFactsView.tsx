// Quick Facts page with interactive cards + simple SVG illustrations.
import { QUICK_FACTS, type QuickFactKey } from '../constants'

type QuickFactsViewProps = {
  activeFactKey: QuickFactKey | null
  onSelectFact: (key: QuickFactKey) => void
}

// Lightweight inline SVGs keep the facts page dependency-free.
const renderFactDiagram = (key: QuickFactKey) => {
  switch (key) {
    case 'directed':
      return (
        <svg viewBox="0 0 240 140" role="img" aria-label="Directed graph illustration">
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="var(--accent)" />
            </marker>
          </defs>
          <line x1="40" y1="70" x2="120" y2="40" stroke="var(--edge)" strokeWidth="3" markerEnd="url(#arrow)" />
          <line x1="120" y1="40" x2="200" y2="70" stroke="var(--edge)" strokeWidth="3" markerEnd="url(#arrow)" />
          <circle cx="40" cy="70" r="14" fill="var(--node-fill)" stroke="var(--node-border)" />
          <circle cx="120" cy="40" r="14" fill="var(--node-fill)" stroke="var(--node-border)" />
          <circle cx="200" cy="70" r="14" fill="var(--node-fill)" stroke="var(--node-border)" />
        </svg>
      )
    case 'trees':
      return (
        <svg viewBox="0 0 240 140" role="img" aria-label="Tree graph illustration">
          <line x1="120" y1="30" x2="60" y2="80" stroke="var(--edge)" strokeWidth="3" />
          <line x1="120" y1="30" x2="180" y2="80" stroke="var(--edge)" strokeWidth="3" />
          <line x1="60" y1="80" x2="40" y2="120" stroke="var(--edge)" strokeWidth="3" />
          <line x1="60" y1="80" x2="80" y2="120" stroke="var(--edge)" strokeWidth="3" />
          <circle cx="120" cy="30" r="14" fill="var(--node-fill)" stroke="var(--node-border)" />
          <circle cx="60" cy="80" r="14" fill="var(--node-fill)" stroke="var(--node-border)" />
          <circle cx="180" cy="80" r="14" fill="var(--node-fill)" stroke="var(--node-border)" />
          <circle cx="40" cy="120" r="12" fill="var(--node-fill)" stroke="var(--node-border)" />
          <circle cx="80" cy="120" r="12" fill="var(--node-fill)" stroke="var(--node-border)" />
        </svg>
      )
    case 'shortest':
      return (
        <svg viewBox="0 0 240 140" role="img" aria-label="Shortest path illustration">
          <line x1="40" y1="70" x2="120" y2="30" stroke="var(--edge)" strokeWidth="2" />
          <line x1="120" y1="30" x2="200" y2="70" stroke="var(--edge)" strokeWidth="2" />
          <line x1="40" y1="70" x2="120" y2="110" stroke="var(--edge)" strokeWidth="2" />
          <line x1="120" y1="110" x2="200" y2="70" stroke="var(--edge)" strokeWidth="2" />
          <line x1="40" y1="70" x2="200" y2="70" stroke="var(--accent)" strokeWidth="4" />
          <circle cx="40" cy="70" r="12" fill="var(--node-fill)" stroke="var(--node-border)" />
          <circle cx="120" cy="30" r="12" fill="var(--node-fill)" stroke="var(--node-border)" />
          <circle cx="120" cy="110" r="12" fill="var(--node-fill)" stroke="var(--node-border)" />
          <circle cx="200" cy="70" r="12" fill="var(--node-fill)" stroke="var(--node-border)" />
        </svg>
      )
    case 'coloring':
      return (
        <svg viewBox="0 0 240 140" role="img" aria-label="Graph coloring illustration">
          <line x1="60" y1="70" x2="120" y2="40" stroke="var(--edge)" strokeWidth="3" />
          <line x1="120" y1="40" x2="180" y2="70" stroke="var(--edge)" strokeWidth="3" />
          <line x1="60" y1="70" x2="180" y2="70" stroke="var(--edge)" strokeWidth="3" />
          <circle cx="60" cy="70" r="14" fill="#f59f5a" stroke="var(--node-border)" />
          <circle cx="120" cy="40" r="14" fill="#5b7cfa" stroke="var(--node-border)" />
          <circle cx="180" cy="70" r="14" fill="#8b5cf6" stroke="var(--node-border)" />
        </svg>
      )
    case 'planar':
      return (
        <svg viewBox="0 0 240 140" role="img" aria-label="Planar graph illustration">
          <line x1="40" y1="40" x2="200" y2="40" stroke="var(--edge)" strokeWidth="2" />
          <line x1="40" y1="100" x2="200" y2="100" stroke="var(--edge)" strokeWidth="2" />
          <line x1="40" y1="40" x2="40" y2="100" stroke="var(--edge)" strokeWidth="2" />
          <line x1="200" y1="40" x2="200" y2="100" stroke="var(--edge)" strokeWidth="2" />
          <line x1="40" y1="40" x2="200" y2="100" stroke="var(--accent)" strokeWidth="3" />
          <circle cx="40" cy="40" r="10" fill="var(--node-fill)" stroke="var(--node-border)" />
          <circle cx="200" cy="40" r="10" fill="var(--node-fill)" stroke="var(--node-border)" />
          <circle cx="40" cy="100" r="10" fill="var(--node-fill)" stroke="var(--node-border)" />
          <circle cx="200" cy="100" r="10" fill="var(--node-fill)" stroke="var(--node-border)" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 240 140" role="img" aria-label="Graph illustration">
          <line x1="50" y1="70" x2="120" y2="40" stroke="var(--edge)" strokeWidth="3" />
          <line x1="120" y1="40" x2="190" y2="70" stroke="var(--edge)" strokeWidth="3" />
          <circle cx="50" cy="70" r="14" fill="var(--node-fill)" stroke="var(--node-border)" />
          <circle cx="120" cy="40" r="14" fill="var(--node-fill)" stroke="var(--node-border)" />
          <circle cx="190" cy="70" r="14" fill="var(--node-fill)" stroke="var(--node-border)" />
        </svg>
      )
  }
}

export default function QuickFactsView({ activeFactKey, onSelectFact }: QuickFactsViewProps) {
  const activeFact = QUICK_FACTS.find((fact) => fact.key === activeFactKey) ?? QUICK_FACTS[0]

  return (
    <div className="facts">
      <div className="facts__header">
        <h2>Quick Facts</h2>
        <p>Build sharper graphs with these core ideas from graph theory.</p>
      </div>
      <div className="facts__grid">
        {QUICK_FACTS.map((fact) => (
          <button
            key={fact.key}
            type="button"
            className={`facts__card ${fact.key === activeFact?.key ? 'is-active' : ''}`}
            onClick={() => onSelectFact(fact.key)}
          >
            <h3>{fact.title}</h3>
            <p>{fact.detail}</p>
          </button>
        ))}
      </div>
      {activeFact ? (
        <div className="facts__detail">
          <div className="facts__detail-text">
            <div className="facts__detail-label">Deep Dive</div>
            <h3>{activeFact.title}</h3>
            <p>{activeFact.long}</p>
          </div>
          <div className="facts__detail-graph">{renderFactDiagram(activeFact.key)}</div>
        </div>
      ) : null}
      <div className="facts__footer">Want more? Try describing your ideal layout in the AI panel.</div>
    </div>
  )
}
