import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useTheme } from '../context/useTheme'
import { useAuth } from '../context/useAuth'
import { getProfileAvatar } from '../data/profileAvatars'
import { useUserActivity } from '../hooks/useUserActivity'
import ProfileActivityTimeline from '../components/ProfileActivityTimeline'

const profileStats = [
  { label: 'Juegos favoritos', icon: 'heart' },
  { label: 'Alertas activas', icon: 'bell' },
  { label: 'Ofertas guardadas', icon: 'tag' },
  { label: 'Búsquedas recientes', icon: 'clock' },
] as const

const profileNavigation = [
  { label: 'Resumen', href: '#profile-summary' },
  { label: 'Información personal', href: '#personal-info' },
  { label: 'Actividad', href: '#account-activity' },
]

function StatIcon({ name }: { name: (typeof profileStats)[number]['icon'] }) {
  const paths = {
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    tag: <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  }

  return (
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
      {paths[name]}
    </svg>
  )
}

function Profile() {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()
  const activity = useUserActivity()
  const selectedAvatar = getProfileAvatar(user?.avatarId ?? null)

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login')
    }
  }, [user, isLoading, navigate])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#061426] text-white">
        <Navbar />
        <div className="flex min-h-[calc(100vh-81px)] items-center justify-center">
          <p className="text-sm text-slate-400" role="status">
            Cargando perfil...
          </p>
        </div>
      </main>
    )
  }

  if (!user) return null

  const initials = user.name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#061426] text-white">
      <div
        className={`absolute inset-0 -z-20 bg-cover transition-opacity duration-300 ease-in-out ${
          theme === 'dark' ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundImage: "url('/home-fondo.jpg')",
          backgroundPosition: 'center',
        }}
        aria-hidden="true"
      />
      <div
        className={`absolute inset-0 -z-20 bg-cover bg-center transition-opacity duration-300 ease-in-out ${
          theme === 'light' ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundImage: "url('/home-fondo-claro.jpg')" }}
        aria-hidden="true"
      />
      <div className="hero-overlay absolute inset-0 -z-10" aria-hidden="true" />

      <Navbar />

      <div className="mx-auto grid max-w-[1440px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[190px_minmax(0,1fr)] lg:px-8">
        <aside className="h-fit rounded-xl border border-blue-300/10 bg-[#06182b]/90 p-3 shadow-xl shadow-slate-950/20">
          <p className="px-3 pb-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Este perfil
          </p>
          <nav aria-label="Secciones del perfil" className="flex gap-2 overflow-x-auto lg:flex-col">
            {profileNavigation.map((item) => (
              <a
                className="shrink-0 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_270px]">
          <section className="min-w-0">
            <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                  Cuenta
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  Mi perfil
                </h1>
                <p className="mt-1.5 text-sm text-slate-300">
                  Tu información personal y actividad en GamePriceTracker.
                </p>
              </div>
              <Link
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                to="/perfil/editar"
              >
                Personalizar perfil
              </Link>
            </header>

            <section
              aria-labelledby="profile-heading"
              id="profile-summary"
              className="mb-5 overflow-hidden rounded-xl border border-blue-300/15 bg-[#071a2d]/90 shadow-xl shadow-slate-950/25 backdrop-blur-sm"
            >
              <div
                aria-hidden="true"
                className="h-24 border-b border-blue-300/10 bg-cover bg-center sm:h-32"
                style={
                  selectedAvatar?.coverPath
                    ? { backgroundImage: `url("${selectedAvatar.coverPath}")` }
                    : undefined
                }
              >
                <span className="sr-only">Espacio reservado para la futura portada del perfil</span>
              </div>
              <div className="px-5 pb-5 sm:px-7">
                <div className="-mt-9 flex flex-col gap-3 sm:-mt-11 sm:flex-row sm:items-end sm:gap-4">
                  <div className="grid h-[72px] w-[72px] shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-[#071a2d] bg-blue-600 text-2xl font-bold text-white shadow-lg shadow-blue-950/40 sm:h-20 sm:w-20">
                    {selectedAvatar ? (
                      <img
                        alt={`Avatar: ${selectedAvatar.name}`}
                        className="h-full w-full scale-110 object-cover"
                        src={selectedAvatar.avatarPath}
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="min-w-0 pb-1">
                    <h2
                      className="truncate text-xl font-bold sm:text-2xl"
                      id="profile-heading"
                    >
                      {user.name}
                    </h2>
                    <p className="mt-1 break-all text-sm text-slate-300">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section
              aria-labelledby="personal-info-heading"
              id="personal-info"
              className="rounded-xl border border-blue-300/15 bg-[#071a2d]/90 p-5 shadow-xl shadow-slate-950/25 backdrop-blur-sm sm:p-6"
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2
                    className="text-lg font-semibold sm:text-xl"
                    id="personal-info-heading"
                  >
                    Información personal
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Datos guardados en tu cuenta.
                  </p>
                </div>
              </div>

              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-blue-200/10 bg-[#0a2037]/70 p-4">
                  <dt className="text-xs font-medium text-slate-400">Nombre</dt>
                  <dd className="mt-2 break-words text-sm font-medium text-slate-100">
                    {user.name}
                  </dd>
                </div>
                <div className="rounded-lg border border-blue-200/10 bg-[#0a2037]/70 p-4">
                  <dt className="text-xs font-medium text-slate-400">
                    Correo electrónico
                  </dt>
                  <dd className="mt-2 break-all text-sm font-medium text-slate-100">
                    {user.email}
                  </dd>
                </div>
              </dl>
            </section>
          </section>

          <aside className="space-y-5">
            <section
              aria-labelledby="stats-heading"
              id="account-activity"
              className="rounded-xl border border-blue-300/15 bg-[#071a2d]/90 p-5 shadow-xl shadow-slate-950/25 backdrop-blur-sm"
            >
              <h2 className="text-lg font-semibold" id="stats-heading">
                Tu actividad
              </h2>
              <ul className="mt-3 divide-y divide-blue-100/10">
                {profileStats.map((stat, index) => {
                  const counts = [
                    activity.favorites.length,
                    activity.alerts.filter((alert) => alert.is_active).length,
                    activity.savedOffers.length,
                    activity.searchHistory.length,
                  ]
                  return (
                  <li
                    className="flex items-center gap-3 py-3 first:pt-2 last:pb-1"
                    key={stat.label}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-blue-300/15 bg-blue-400/10 text-blue-300">
                      <StatIcon name={stat.icon} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100">
                        {stat.label}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {activity.loading
                          ? 'Cargando...'
                          : counts[index] === 0
                            ? 'Sin datos'
                            : counts[index]}
                      </p>
                    </div>
                  </li>
                  )
                })}
              </ul>
            </section>

            <ProfileActivityTimeline
              alerts={activity.alerts}
              error={activity.error}
              favorites={activity.favorites}
              loading={activity.loading}
              savedOffers={activity.savedOffers}
              searchHistory={activity.searchHistory}
            />

            <section className="rounded-xl border border-blue-300/15 bg-[#071a2d]/90 p-5 shadow-xl shadow-slate-950/25">
              <h2 className="text-lg font-semibold">Tus elementos guardados</h2>
              {activity.loading ? (
                <p className="mt-3 text-sm text-slate-400" role="status">Cargando...</p>
              ) : activity.favorites.length || activity.alerts.length || activity.savedOffers.length ? (
                <div className="mt-3 space-y-4">
                  {activity.favorites.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Favoritos</h3>
                      <ul className="mt-2 space-y-2">
                        {activity.favorites.map((favorite) => (
                          <li className="flex items-center justify-between gap-2 text-sm" key={favorite.id}>
                            <span className="truncate text-slate-200">{favorite.game_id}</span>
                            <button className="shrink-0 text-xs text-red-300 hover:text-red-200" onClick={() => void activity.removeFavorite(favorite.id).catch(() => undefined)} type="button">Quitar</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {activity.alerts.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Alertas</h3>
                      <ul className="mt-2 space-y-2">
                        {activity.alerts.map((alert) => (
                          <li className="flex items-center justify-between gap-2 text-sm" key={alert.id}>
                            <span className="min-w-0 truncate text-slate-200">{alert.game_id} · ${Number(alert.target_price).toFixed(2)}</span>
                            <button className="shrink-0 text-xs text-blue-300 hover:text-blue-200" onClick={() => void activity.setAlertActive(alert.id, !alert.is_active).catch(() => undefined)} type="button">{alert.is_active ? 'Pausar' : 'Activar'}</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {activity.savedOffers.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ofertas</h3>
                      <ul className="mt-2 space-y-2">
                        {activity.savedOffers.map((offer) => (
                          <li className="flex items-center justify-between gap-2 text-sm" key={offer.id}>
                            <a className="min-w-0 truncate text-sky-300 hover:underline" href={offer.url} rel="noreferrer" target="_blank">
                              Oferta {offer.offer_id} · ${Number(offer.price_at_save).toFixed(2)}
                            </a>
                            <button className="shrink-0 text-xs text-red-300 hover:text-red-200" onClick={() => void activity.removeSavedOffer(offer.id).catch(() => undefined)} type="button">Quitar</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">Sin datos guardados.</p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}

export default Profile
