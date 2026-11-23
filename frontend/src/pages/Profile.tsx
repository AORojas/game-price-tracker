import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BackToTopButton from '../components/BackToTopButton'
import Navbar from '../components/Navbar'
import { useTheme } from '../context/useTheme'
import { useAuth } from '../context/useAuth'
import { getProfileAvatar } from '../data/profileAvatars'
import { useUserActivity } from '../hooks/useUserActivity'
import ProfileSavedItems from '../components/ProfileSavedItems'
import ProfileSearchHistory from '../components/ProfileSearchHistory'
import ProfileWishlist from '../components/ProfileWishlist'

const profileStats = [
  { label: 'Juegos favoritos', icon: 'heart', sectionId: 'wishlist-section' },
  { label: 'Alertas activas', icon: 'bell', sectionId: 'price-alerts' },
  { label: 'Ofertas guardadas', icon: 'tag', sectionId: 'saved-offers' },
  { label: 'Búsquedas recientes', icon: 'clock', sectionId: 'recent-searches' },
] as const

const profileNavigation = [
  { label: 'Resumen / Perfil', sectionId: 'profile-summary' },
  { label: 'Mi lista de deseados', sectionId: 'wishlist-section' },
  { label: 'Información personal', sectionId: 'personal-info' },
  { label: 'Ofertas guardadas', sectionId: 'saved-offers' },
  { label: 'Alertas de precios', sectionId: 'price-alerts' },
  { label: 'Tu actividad', sectionId: 'account-activity' },
  { label: 'Búsquedas recientes', sectionId: 'recent-searches' },
]

function scrollToProfileSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

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
      <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar />
        <div className="flex min-h-[calc(100vh-81px)] items-center justify-center">
          <p className="text-sm text-[var(--color-text-muted)]" role="status">
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
    <>
    <main className="relative isolate min-h-screen w-full max-w-full overflow-x-clip bg-[var(--color-bg)] text-[var(--color-text)]">
      <div
        className={`fixed inset-0 -z-20 bg-fixed bg-cover transition-opacity duration-300 ease-in-out ${
          theme === 'dark' ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundImage: "url('/home-fondo.jpg')",
          backgroundPosition: 'center',
        }}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-0 -z-20 bg-fixed bg-cover bg-center transition-opacity duration-300 ease-in-out ${
          theme === 'light' ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundImage: "url('/home-fondo-claro.jpg')" }}
        aria-hidden="true"
      />
      <div className="hero-overlay absolute inset-0 -z-10" aria-hidden="true" />

      <Navbar overlay />

      <div className="mx-auto grid w-full min-w-0 max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-5 overflow-x-clip px-4 py-5 sm:px-6 lg:grid-cols-[190px_minmax(0,1fr)] lg:px-8">
        <aside className="h-fit min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xl shadow-slate-950/20">
          <p className="px-3 pb-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Este perfil
          </p>
          <nav
            aria-label="Secciones del perfil"
            className="flex max-w-full flex-nowrap gap-2 overflow-x-auto lg:flex-col"
          >
            {profileNavigation.map((item) => (
              <a
                className="shrink-0 rounded-lg px-3 py-2.5 text-sm text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                href={`#${item.sectionId}`}
                key={item.sectionId}
                onClick={(event) => {
                  event.preventDefault()
                  scrollToProfileSection(item.sectionId)
                }}
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
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                    theme === 'light'
                      ? 'text-blue-200'
                      : 'text-[var(--color-accent)]'
                  }`}
                >
                  Cuenta
                </p>
                <h1
                  className={`mt-1 text-2xl font-bold tracking-tight sm:text-3xl ${
                    theme === 'light' ? 'text-white' : 'text-[var(--color-text)]'
                  }`}
                >
                  Mi perfil
                </h1>
                <p
                  className={`mt-1.5 text-sm ${
                    theme === 'light'
                      ? 'text-slate-200'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                >
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
              className="mb-5 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl shadow-slate-950/25 backdrop-blur-sm"
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
                  <div className="grid h-[72px] w-[72px] shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-[var(--color-surface)] bg-blue-600 text-2xl font-bold text-white shadow-lg shadow-blue-950/40 sm:h-20 sm:w-20">
                    {selectedAvatar ? (
                      <img
                        alt={`Avatar: ${selectedAvatar.name}`}
                        className="h-full w-full scale-110 object-cover"
                        src={selectedAvatar.avatarPath}
                      />
                    ) : user.avatarUrl ? (
                      <img
                        alt={`Avatar de ${user.name}`}
                        className="h-full w-full object-cover"
                        src={user.avatarUrl}
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="min-w-0 pb-1 sm:mt-11">
                    <h2
                      className="truncate text-xl font-bold sm:text-2xl"
                      id="profile-heading"
                    >
                      {user.name}
                    </h2>
                    <p className="mt-1 break-all text-sm text-[var(--color-text-muted)]">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <ProfileWishlist
              error={activity.error}
              favorites={activity.favorites}
              loading={activity.loading}
              onRemoveFavorite={activity.removeFavorite}
            />

            <section
              aria-labelledby="personal-info-heading"
              id="personal-info"
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl shadow-slate-950/25 backdrop-blur-sm sm:p-6"
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2
                    className="text-lg font-semibold sm:text-xl"
                    id="personal-info-heading"
                  >
                    Información personal
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    Datos guardados en tu cuenta.
                  </p>
                </div>
              </div>

              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                  <dt className="text-xs font-medium text-[var(--color-text-muted)]">Nombre</dt>
                  <dd className="mt-2 break-words text-sm font-medium text-[var(--color-text)]">
                    {user.name}
                  </dd>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                  <dt className="text-xs font-medium text-[var(--color-text-muted)]">
                    Correo electrónico
                  </dt>
                  <dd className="mt-2 break-all text-sm font-medium text-[var(--color-text)]">
                    {user.email}
                  </dd>
                </div>
              </dl>
            </section>
            <ProfileSavedItems
              alerts={activity.alerts}
              error={activity.error}
              loading={activity.loading}
              onRemoveAlert={activity.removeAlert}
              onRemoveSavedOffer={activity.removeSavedOffer}
              onSetAlertActive={activity.setAlertActive}
              onUpdateAlertTargetPrice={activity.updateAlertTargetPrice}
              savedOffers={activity.savedOffers}
            />
          </section>

          <aside className="space-y-5">
            <section
              aria-labelledby="stats-heading"
              id="account-activity"
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl shadow-slate-950/25 backdrop-blur-sm"
            >
              <h2 className="text-lg font-semibold" id="stats-heading">
                Tu actividad
              </h2>
              <ul className="mt-3 divide-y divide-[var(--color-border)]">
                {profileStats.map((stat, index) => {
                  const counts = [
                    activity.favorites.length,
                    activity.alerts.filter(
                      (alert) => alert.is_active && !alert.is_notified,
                    ).length,
                    activity.savedOffers.length,
                    activity.searchHistory.length,
                  ]
                  return (
                    <li
                      className="py-1 first:pt-0 last:pb-0"
                      key={stat.label}
                    >
                      <button
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        onClick={() => scrollToProfileSection(stat.sectionId)}
                        type="button"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-blue-400/10 text-[var(--color-accent)]">
                          <StatIcon name={stat.icon} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-[var(--color-text)]">
                            {stat.label}
                          </span>
                          <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
                            {activity.loading
                              ? 'Cargando...'
                              : counts[index] === 0
                                ? 'Sin datos'
                                : counts[index]}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>

            <ProfileSearchHistory
              error={activity.error}
              loading={activity.loading}
              searchHistory={activity.searchHistory}
            />
          </aside>
        </div>
      </div>
    </main>
    <BackToTopButton />
    </>
  )
}

export default Profile
