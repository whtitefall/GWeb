// Home dashboard with graph cards, inspired by Notion's recent pages.
import type { GraphSummary } from '../graphTypes'
import { useI18n } from '../i18n'
import { formatUpdatedAt } from '../utils/time'

type HomeViewProps = {
  graphList: GraphSummary[]
  activeGraphId: string | null
  onOpenGraph: (graphId: string) => void
}

function getThumbVariant(id: string) {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 4
  }
  return hash
}

export default function HomeView({ graphList, activeGraphId, onOpenGraph }: HomeViewProps) {
  const { t } = useI18n()

  if (graphList.length === 0) {
    return (
      <section className="home-view">
        <header className="home-view__header">
          <h1>{t('home.title')}</h1>
          <p>{t('home.subtitle')}</p>
        </header>
        <div className="home-view__empty">{t('home.empty')}</div>
      </section>
    )
  }

  return (
    <section className="home-view">
      <header className="home-view__header">
        <h1>{t('home.title')}</h1>
        <p>{t('home.subtitle')}</p>
      </header>
      <div className="home-grid" role="list" aria-label={t('home.recent')}>
        {graphList.map((graph) => {
          const variant = getThumbVariant(graph.id)
          return (
            <button
              key={graph.id}
              type="button"
              role="listitem"
              className={`home-card ${activeGraphId === graph.id ? 'is-active' : ''}`}
              onClick={() => onOpenGraph(graph.id)}
            >
              <div className={`home-card__thumb home-card__thumb--${variant}`}>
                <div className="home-card__spark home-card__spark--1" />
                <div className="home-card__spark home-card__spark--2" />
                <div className="home-card__spark home-card__spark--3" />
              </div>
              <div className="home-card__body">
                <div className="home-card__title">{graph.name}</div>
                <div className="home-card__meta">{formatUpdatedAt(graph.updatedAt)}</div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

