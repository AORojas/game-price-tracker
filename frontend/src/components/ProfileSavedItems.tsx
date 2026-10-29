import { useState } from 'react'
import type {
  Favorite,
  SavedOffer,
  UserAlert,
} from '../services/userActivityService'

type ProfileSavedItemsProps = {
  favorites: Favorite[]
  alerts: UserAlert[]
  savedOffers: SavedOffer[]
  loading: boolean
  error: string
  onRemoveFavorite: (favoriteId: string) => Promise<void>
  onSetAlertActive: (alertId: string, isActive: boolean) => Promise<UserAlert>
  onRemoveSavedOffer: (savedOfferId: string) => Promise<void>
}

function formatUsd(value: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value))
}

function Artwork({
  title,
  image,
  className,
}: {
  title: string
  image: string | null
  className: string
}) {
  return image ? (
    <img
      alt={`Carátula de ${title}`}
      className={className}
      loading="lazy"
      src={image}
    />
  ) : (
    <div
      aria-label={`Carátula no disponible para ${title}`}
      className={`${className} grid place-items-center bg-[#102a43] px-2 text-center text-xs text-slate-400`}
      role="img"
    >
      Sin carátula
    </div>
  )
}

function ProfileSavedItems({
  favorites,
  alerts,
  savedOffers,
  loading,
  error,
  onRemoveFavorite,
  onSetAlertActive,
  onRemoveSavedOffer,
}: ProfileSavedItemsProps) {
  const [pendingAlertId, setPendingAlertId] = useState<string | null>(null)
  const hasSavedItems = favorites.length + alerts.length + savedOffers.length > 0

  async function toggleAlert(alert: UserAlert) {
    setPendingAlertId(alert.id)
    try {
      await onSetAlertActive(alert.id, !alert.is_active)
    } catch {
      // The activity hook surfaces the request error in this section.
    } finally {
      setPendingAlertId(null)
    }
  }

  return (
    <section
      aria-labelledby="saved-items-heading"
      className="mt-5 rounded-xl border border-blue-300/15 bg-[#071a2d]/90 p-5 shadow-xl shadow-slate-950/25 backdrop-blur-sm sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold sm:text-xl" id="saved-items-heading">
            Tus elementos guardados
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Tus juegos y ofertas, en un solo lugar.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="mt-4 text-sm text-slate-400" role="status">
          Cargando elementos guardados...
        </p>
      ) : hasSavedItems ? (
        <div className="mt-5 space-y-6">
          {favorites.length > 0 && (
            <section aria-labelledby="favorite-games-heading">
              <h3
                className="text-xs font-semibold uppercase tracking-wide text-slate-400"
                id="favorite-games-heading"
              >
                Favoritos
              </h3>
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {favorites.map((favorite) => {
                  const title = favorite.game_title ?? 'Juego guardado'
                  return (
                    <li
                      className="overflow-hidden rounded-lg border border-blue-200/10 bg-[#0a2037]/70"
                      key={favorite.id}
                    >
                      <Artwork
                        className="aspect-[3/4] w-full object-cover"
                        image={favorite.game_image}
                        title={title}
                      />
                      <div className="p-3">
                        <p className="truncate text-sm font-medium text-slate-100" title={title}>
                          {title}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Precio actual sin consultar
                        </p>
                        <button
                          className="mt-2 text-xs font-medium text-red-300 transition hover:text-red-200"
                          onClick={() => void onRemoveFavorite(favorite.id).catch(() => undefined)}
                          type="button"
                        >
                          Quitar de favoritos
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {alerts.length > 0 && (
            <section aria-labelledby="price-alerts-heading">
              <h3
                className="text-xs font-semibold uppercase tracking-wide text-slate-400"
                id="price-alerts-heading"
              >
                Alertas de precios
              </h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {alerts.map((alert) => {
                  const title = alert.game_title ?? 'Juego guardado'
                  const isPending = pendingAlertId === alert.id
                  return (
                    <li
                      className="flex min-w-0 items-center gap-3 rounded-lg border border-blue-200/10 bg-[#0a2037]/70 p-3"
                      key={alert.id}
                    >
                      <Artwork
                        className="h-16 w-12 shrink-0 rounded object-cover"
                        image={alert.game_image}
                        title={title}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100" title={title}>
                          {title}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Objetivo: {formatUsd(alert.target_price)}
                        </p>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            alert.is_active
                              ? 'bg-emerald-400/10 text-emerald-300'
                              : 'bg-slate-400/10 text-slate-400'
                          }`}
                        >
                          {alert.is_active ? 'Activa' : 'Pausada'}
                        </span>
                      </div>
                      <button
                        aria-checked={alert.is_active}
                        aria-label={`${alert.is_active ? 'Pausar' : 'Activar'} alerta de ${title}`}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-wait disabled:opacity-60 ${
                          alert.is_active ? 'bg-blue-500' : 'bg-slate-600'
                        }`}
                        disabled={isPending}
                        onClick={() => void toggleAlert(alert)}
                        role="switch"
                        type="button"
                      >
                        <span
                          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                            alert.is_active ? 'left-6' : 'left-1'
                          }`}
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {savedOffers.length > 0 && (
            <section aria-labelledby="saved-offers-heading">
              <h3
                className="text-xs font-semibold uppercase tracking-wide text-slate-400"
                id="saved-offers-heading"
              >
                Ofertas guardadas
              </h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {savedOffers.map((offer) => {
                  const title = offer.game_title ?? 'Juego guardado'
                  return (
                    <li
                      className="flex min-w-0 items-center gap-3 rounded-lg border border-blue-200/10 bg-[#0a2037]/70 p-3"
                      key={offer.id}
                    >
                      <Artwork
                        className="h-16 w-12 shrink-0 rounded object-cover"
                        image={offer.game_image}
                        title={title}
                      />
                      <div className="min-w-0 flex-1">
                        <a
                          className="block truncate text-sm font-medium text-sky-200 hover:text-sky-100 hover:underline"
                          href={offer.url}
                          rel="noreferrer"
                          target="_blank"
                          title={title}
                        >
                          {title}
                        </a>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {formatUsd(offer.price_at_save)}
                        </p>
                      </div>
                      <button
                        aria-label={`Quitar oferta guardada de ${title}`}
                        className="shrink-0 text-xs font-medium text-red-300 transition hover:text-red-200"
                        onClick={() => void onRemoveSavedOffer(offer.id).catch(() => undefined)}
                        type="button"
                      >
                        Quitar
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-blue-200/15 bg-[#0a2037]/60 px-4 py-5 text-sm text-slate-400">
          Aún no guardaste favoritos, alertas ni ofertas.
        </p>
      )}
    </section>
  )
}

export default ProfileSavedItems
