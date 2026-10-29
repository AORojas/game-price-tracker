import type {
  Favorite,
  SavedOffer,
  SearchHistoryEntry,
  UserAlert,
} from '../services/userActivityService'
import { formatActivityDate } from '../utils/formatActivityDate'

type ActivityType = 'search' | 'favorite' | 'alert' | 'offer'

type ActivityItem = {
  id: string
  type: ActivityType
  description: string
  createdAt: string
}

type ProfileActivityTimelineProps = {
  favorites: Favorite[]
  alerts: UserAlert[]
  savedOffers: SavedOffer[]
  searchHistory: SearchHistoryEntry[]
  loading: boolean
  error: string
}

const activityStyles: Record<ActivityType, { label: string; icon: string }> = {
  search: { label: 'Búsqueda', icon: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35' },
  favorite: { label: 'Favorito', icon: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z' },
  alert: { label: 'Alerta', icon: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4' },
  offer: { label: 'Oferta', icon: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01' },
}

function createActivityItems({
  favorites,
  alerts,
  savedOffers,
  searchHistory,
}: Pick<
  ProfileActivityTimelineProps,
  'favorites' | 'alerts' | 'savedOffers' | 'searchHistory'
>): ActivityItem[] {
  return [
    ...searchHistory.map((entry) => ({
      id: `search-${entry.id}`,
      type: 'search' as const,
      description: `Buscaste ${entry.search_term}`,
      createdAt: entry.created_at,
    })),
    ...favorites.map((favorite) => ({
      id: `favorite-${favorite.id}`,
      type: 'favorite' as const,
      description: 'Agregaste un juego a favoritos',
      createdAt: favorite.created_at,
    })),
    ...alerts.map((alert) => ({
      id: `alert-${alert.id}`,
      type: 'alert' as const,
      description: 'Creaste una alerta de precio',
      createdAt: alert.created_at,
    })),
    ...savedOffers.map((offer) => ({
      id: `offer-${offer.id}`,
      type: 'offer' as const,
      description: 'Guardaste una oferta',
      createdAt: offer.created_at,
    })),
  ].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  )
}

function ProfileActivityTimeline({
  favorites,
  alerts,
  savedOffers,
  searchHistory,
  loading,
  error,
}: ProfileActivityTimelineProps) {
  const items = createActivityItems({
    favorites,
    alerts,
    savedOffers,
    searchHistory,
  }).slice(0, 6)

  return (
    <section
      aria-labelledby="recent-activity-heading"
      className="rounded-xl border border-blue-300/15 bg-[#071a2d]/90 p-5 shadow-xl shadow-slate-950/25"
    >
      <h2 className="text-lg font-semibold" id="recent-activity-heading">
        Actividad reciente
      </h2>
      {error && (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="mt-3 text-sm text-slate-400" role="status">
          Cargando actividad...
        </p>
      ) : items.length > 0 ? (
        <ol className="mt-4 space-y-4">
          {items.map((item) => {
            const activityStyle = activityStyles[item.type]
            return (
              <li className="flex gap-3" key={item.id}>
                <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-blue-300/20 bg-blue-400/10 text-blue-300">
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    <path d={activityStyle.icon} />
                  </svg>
                </span>
                <div className="min-w-0 flex-1 border-b border-blue-100/10 pb-3 last:border-0">
                  <p className="text-sm leading-5 text-slate-200">{item.description}</p>
                  <time
                    className="mt-1 block text-xs text-slate-500"
                    dateTime={item.createdAt}
                  >
                    {formatActivityDate(item.createdAt)}
                  </time>
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-blue-200/15 bg-[#0a2037]/60 px-4 py-5 text-sm leading-6 text-slate-400">
          Todavía no hay actividad. Tus búsquedas y elementos guardados aparecerán aquí.
        </p>
      )}
    </section>
  )
}

export default ProfileActivityTimeline
