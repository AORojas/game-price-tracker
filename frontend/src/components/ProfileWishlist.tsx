import { Link } from 'react-router-dom'
import type { Favorite } from '../services/userActivityService'

type ProfileWishlistProps = {
  favorites: Favorite[]
  loading: boolean
  error: string
  onRemoveFavorite: (favoriteId: string) => Promise<void>
}

function ProfileWishlist({
  favorites,
  loading,
  error,
  onRemoveFavorite,
}: ProfileWishlistProps) {
  const visibleFavorites = favorites.slice(0, 4)

  return (
    <section
      aria-labelledby="wishlist-heading"
      className="mb-5 rounded-xl border border-blue-300/15 bg-[#071a2d]/90 p-5 shadow-xl shadow-slate-950/25 backdrop-blur-sm sm:p-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-blue-300/20 bg-blue-400/10 text-blue-300">
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
            </svg>
          </span>
          <div>
            <h2 className="text-lg font-semibold sm:text-xl" id="wishlist-heading">
              Mi lista de deseados
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Juegos que quieres seguir de cerca.
            </p>
          </div>
        </div>
        {favorites.length > 0 && !loading && (
          <Link
            className="text-sm font-semibold text-sky-300 transition hover:text-sky-200"
            to="/mi-lista"
          >
            Ver todos
          </Link>
        )}
      </header>

      {error && (
        <p className="mt-4 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="mt-5 text-sm text-slate-400" role="status">
          Cargando tus juegos...
        </p>
      ) : favorites.length > 0 ? (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {visibleFavorites.map((favorite) => {
            const title = favorite.game_title ?? 'Juego guardado'
            return (
              <li
                className="group overflow-hidden rounded-xl border border-blue-200/10 bg-[#0a2037]/75 transition duration-200 hover:-translate-y-0.5 hover:border-blue-300/30 hover:shadow-lg hover:shadow-blue-950/30"
                key={favorite.id}
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-[#102a43]">
                  {favorite.game_image ? (
                    <img
                      alt={`Carátula de ${title}`}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                      src={favorite.game_image}
                    />
                  ) : (
                    <div
                      aria-label={`Carátula no disponible para ${title}`}
                      className="grid h-full place-items-center px-3 text-center text-xs text-slate-400"
                      role="img"
                    >
                      Sin carátula disponible
                    </div>
                  )}
                  <span
                    aria-label="En tu lista de deseados"
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-slate-950/75 text-rose-300 shadow"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
                    </svg>
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="truncate text-sm font-semibold text-slate-100" title={title}>
                    {title}
                  </h3>
                  <Link
                    className="mt-2 block text-xs font-semibold text-sky-300 transition hover:text-sky-200"
                    to={`/explorar?search=${encodeURIComponent(title)}`}
                  >
                    Buscar ofertas
                  </Link>
                  <button
                    className="mt-2 text-xs text-slate-400 transition hover:text-red-300"
                    onClick={() => void onRemoveFavorite(favorite.id).catch(() => undefined)}
                    type="button"
                  >
                    Quitar de mi lista
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-blue-200/15 bg-[#0a2037]/60 px-5 py-8 text-center">
          <p className="text-sm font-medium text-slate-200">
            Tu lista de deseados todavía está vacía.
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Explora juegos y guarda tus favoritos para encontrarlos aquí.
          </p>
          <Link
            className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            to="/explorar"
          >
            Explorar juegos
          </Link>
        </div>
      )}
    </section>
  )
}

export default ProfileWishlist
