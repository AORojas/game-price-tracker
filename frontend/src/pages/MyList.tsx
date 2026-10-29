import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/useAuth'
import { useUserActivity } from '../hooks/useUserActivity'
import { formatActivityDate } from '../utils/formatActivityDate'

function MyList() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const activity = useUserActivity()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!isAuthLoading && !user) navigate('/login')
  }, [isAuthLoading, navigate, user])

  const filteredFavorites = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return activity.favorites

    return activity.favorites.filter((favorite) =>
      (favorite.game_title ?? favorite.game_id)
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    )
  }, [activity.favorites, query])

  if (isAuthLoading || !user) {
    return (
      <main className="min-h-screen bg-[#071323] text-white">
        <Navbar />
        <div className="grid min-h-[calc(100vh-81px)] place-items-center px-6">
          <p className="text-sm text-slate-400" role="status">
            {isAuthLoading ? 'Cargando tu lista...' : 'Redirigiendo al inicio de sesión...'}
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#061426] text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover bg-center opacity-40"
        style={{ backgroundImage: "url('/home-fondo.jpg')" }}
      />
      <div className="hero-overlay absolute inset-0 -z-10" aria-hidden="true" />
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 rounded-2xl border border-blue-300/15 bg-[#071a2d]/90 p-6 shadow-xl shadow-slate-950/25 backdrop-blur-sm sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
              Tu colección personal
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Mi lista de deseados
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
              Guarda los juegos que te interesan y vuelve cuando quieras para consultar sus ofertas.
            </p>
          </div>
          <Link
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            to="/explorar"
          >
            Explorar juegos
          </Link>
        </header>

        <div className="mt-5 flex flex-col gap-4 rounded-xl border border-blue-300/15 bg-[#071a2d]/90 p-4 shadow-xl shadow-slate-950/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-100">
              {activity.loading
                ? 'Cargando juegos...'
                : `${activity.favorites.length} ${activity.favorites.length === 1 ? 'juego guardado' : 'juegos guardados'}`}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Solo tú puedes ver los elementos de esta lista.
            </p>
          </div>
          {activity.favorites.length > 0 && (
            <label className="flex w-full items-center gap-3 rounded-lg border border-blue-200/10 bg-[#0a2037]/80 px-3 py-2.5 sm:max-w-sm">
              <svg
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-slate-400"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <input
                aria-label="Buscar en mi lista"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar un juego de mi lista"
                type="search"
                value={query}
              />
            </label>
          )}
        </div>

        {activity.error && (
          <p className="mt-4 rounded-lg border border-red-400/20 bg-red-950/30 px-4 py-3 text-sm text-red-200" role="alert">
            {activity.error}
          </p>
        )}

        {activity.loading ? (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                aria-hidden="true"
                className="animate-pulse overflow-hidden rounded-xl border border-blue-200/10 bg-[#0a2037]/75"
                key={index}
              >
                <div className="aspect-[3/4] bg-white/5" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 rounded bg-white/5" />
                  <div className="h-3 w-1/2 rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : activity.favorites.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-blue-200/20 bg-[#071a2d]/85 px-6 py-14 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-blue-300/20 bg-blue-400/10 text-blue-300">
              <svg
                aria-hidden="true"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
                viewBox="0 0 24 24"
              >
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
              </svg>
            </span>
            <h2 className="mt-4 text-xl font-semibold">Tu lista está vacía</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              Explora el catálogo y agrega tus juegos favoritos para tenerlos siempre a mano.
            </p>
            <Link
              className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
              to="/explorar"
            >
              Encontrar juegos
            </Link>
          </div>
        ) : filteredFavorites.length > 0 ? (
          <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredFavorites.map((favorite) => {
              const title = favorite.game_title ?? 'Juego guardado'
              return (
                <li
                  className="group overflow-hidden rounded-xl border border-blue-200/10 bg-[#071a2d]/95 shadow-lg shadow-slate-950/20 transition duration-200 hover:-translate-y-1 hover:border-blue-300/30 hover:shadow-blue-950/40"
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
                        className="grid h-full place-items-center px-4 text-center text-sm text-slate-400"
                        role="img"
                      >
                        Sin carátula disponible
                      </div>
                    )}
                    <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-slate-950/75 text-rose-300">
                      <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
                      </svg>
                    </span>
                  </div>
                  <div className="p-4">
                    <h2 className="truncate font-semibold text-slate-100" title={title}>
                      {title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Agregado {formatActivityDate(favorite.created_at)}
                    </p>
                    <div className="mt-4 flex flex-col gap-2">
                      <Link
                        className="rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-blue-500"
                        to={`/explorar?search=${encodeURIComponent(title)}`}
                      >
                        Buscar ofertas
                      </Link>
                      <button
                        className="rounded-lg border border-blue-200/10 px-3 py-2 text-sm text-slate-300 transition hover:border-red-300/30 hover:text-red-300"
                        onClick={() => void activity.removeFavorite(favorite.id).catch(() => undefined)}
                        type="button"
                      >
                        Quitar de mi lista
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-blue-200/15 bg-[#071a2d]/85 px-5 py-10 text-center">
            <p className="font-medium text-slate-200">No encontramos juegos con “{query}”.</p>
            <button
              className="mt-3 text-sm font-semibold text-sky-300 hover:text-sky-200"
              onClick={() => setQuery('')}
              type="button"
            >
              Limpiar búsqueda
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

export default MyList
