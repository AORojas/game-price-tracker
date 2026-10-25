import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/useAuth'
import { useTheme } from '../context/useTheme'
import {
  profileAvatars,
  type ProfileAvatarCategory,
} from '../data/profileAvatars'
import type { AuthUser } from '../services/authService'

const categories: Array<'Todos' | ProfileAvatarCategory> = [
  'Todos',
  ...new Set(profileAvatars.map((avatar) => avatar.category)),
]

const profileSections = [
  { label: 'Resumen', href: '/perfil#profile-summary' },
  { label: 'Información personal', href: '/perfil#personal-info' },
  { label: 'Actividad', href: '/perfil#account-activity' },
]

function ProfileCustomization() {
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()

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

  return <CustomizationForm key={user.id} user={user} />
}

function CustomizationForm({ user }: { user: AuthUser }) {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const { saveAvatar } = useAuth()
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(
    user.avatarId,
  )
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>('Todos')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const selectedAvatar =
    profileAvatars.find((avatar) => avatar.id === selectedAvatarId) ?? null
  const filteredAvatars =
    activeCategory === 'Todos'
      ? profileAvatars
      : profileAvatars.filter((avatar) => avatar.category === activeCategory)
  const hasChanges = selectedAvatarId !== user.avatarId

  async function handleSave() {
    if (!selectedAvatarId || !hasChanges || isSaving) return

    setErrorMessage('')
    setSuccessMessage('')
    setIsSaving(true)
    try {
      await saveAvatar(selectedAvatarId)
      setSuccessMessage('Tu avatar se guardó correctamente.')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el avatar. Inténtalo nuevamente.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancel() {
    setSelectedAvatarId(user.avatarId)
    navigate('/perfil')
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#061426] text-white">
      <div
        className={`absolute inset-0 -z-20 bg-cover bg-center transition-opacity duration-300 ${
          theme === 'dark' ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundImage: "url('/home-fondo.jpg')" }}
        aria-hidden="true"
      />
      <div
        className={`absolute inset-0 -z-20 bg-cover bg-center transition-opacity duration-300 ${
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
          <nav
            aria-label="Secciones del perfil"
            className="flex gap-2 overflow-x-auto lg:flex-col"
          >
            {profileSections.map((section) => (
              <a
                className="shrink-0 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                href={section.href}
                key={section.href}
              >
                {section.label}
              </a>
            ))}
            <Link
              aria-current="page"
              className="shrink-0 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/30"
              to="/perfil/editar"
            >
              Personalizar perfil
            </Link>
          </nav>
        </aside>

        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(350px,.95fr)]">
          <section className="min-w-0 rounded-xl border border-blue-300/15 bg-[#071a2d]/90 p-4 shadow-xl shadow-slate-950/25 backdrop-blur-sm sm:p-5">
            <header className="flex items-start gap-3 border-b border-blue-200/10 pb-5">
              <Link
                aria-label="Volver al perfil"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-500/10 text-xl text-blue-300 transition hover:bg-blue-500/20"
                to="/perfil"
              >
                ←
              </Link>
              <div>
                <h1 className="text-xl font-bold sm:text-2xl">
                  Personalizar perfil
                </h1>
                <p className="mt-1 text-sm leading-5 text-slate-400">
                  Elegí el avatar que quieres mostrar. El espacio para la portada queda reservado para más adelante.
                </p>
              </div>
            </header>

            <div className="mt-5">
              <h2 className="text-base font-semibold">Elegí tu avatar</h2>
              <p className="mt-1 text-sm text-slate-400">
                La selección se guarda solo cuando confirmas los cambios.
              </p>

              <div
                aria-label="Filtrar avatares por categoría"
                className="mt-4 flex gap-2 overflow-x-auto pb-2"
              >
                {categories.map((category) => (
                  <button
                    aria-pressed={activeCategory === category}
                    className={`shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition ${
                      activeCategory === category
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-blue-200/10 bg-[#0a2037] text-slate-300 hover:border-blue-300/30'
                    }`}
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    type="button"
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div
                aria-label="Galería de avatares"
                className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4"
                role="radiogroup"
              >
                {filteredAvatars.map((avatar) => {
                  const isSelected = avatar.id === selectedAvatarId
                  return (
                    <button
                      aria-checked={isSelected}
                      aria-label={`${avatar.name}, ${avatar.category}`}
                      className={`group relative aspect-square overflow-hidden rounded-xl border-2 bg-[#0a2037] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                        isSelected
                          ? 'border-blue-400 shadow-lg shadow-blue-900/40'
                          : 'border-blue-200/10 hover:border-blue-300/50'
                      }`}
                      key={avatar.id}
                      onClick={() => {
                        setSelectedAvatarId(avatar.id)
                        setErrorMessage('')
                        setSuccessMessage('')
                      }}
                      role="radio"
                      type="button"
                    >
                      <span className="absolute inset-1 overflow-hidden rounded-lg">
                        <img
                          alt=""
                          className="h-full w-full scale-105 object-cover transition duration-200 group-hover:scale-110"
                          loading="lazy"
                          src={avatar.avatarPath}
                        />
                      </span>
                      <span className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent px-2 pb-2 pt-7 text-left text-[11px] font-medium text-white">
                        {avatar.name}
                      </span>
                      {isSelected && (
                        <span
                          aria-hidden="true"
                          className="absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-blue-500 text-sm font-bold text-white ring-2 ring-white"
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="min-w-0">
            <div className="overflow-hidden rounded-xl border border-blue-300/15 bg-[#071a2d]/90 shadow-xl shadow-slate-950/25 backdrop-blur-sm">
              <div className="flex items-center gap-2 px-5 pt-5">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 text-sky-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <h2 className="text-base font-semibold">Vista previa de tu perfil</h2>
              </div>

              <div
                className="mx-4 mt-4 grid h-36 place-items-center overflow-hidden rounded-lg border border-dashed border-blue-200/15 bg-[#0a2037] px-5 text-center sm:h-40"
                aria-label="Espacio reservado para la futura portada del perfil; todavía no hay imagen asignada"
                role="img"
              >
                <span className="text-sm text-slate-500">
                  Espacio reservado para la portada
                </span>
              </div>

              <div className="px-5 pb-5">
                <div className="-mt-7 flex items-end gap-3">
                  <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-[#071a2d] bg-blue-600 text-xl font-bold text-white shadow-lg shadow-blue-950/40">
                    {selectedAvatar ? (
                      <img
                        alt={`Vista previa del avatar ${selectedAvatar.name}`}
                        className="h-full w-full scale-110 object-cover"
                        src={selectedAvatar.avatarPath}
                      />
                    ) : (
                      <span aria-label="Avatar sin seleccionar">
                        {user.name.trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {selectedAvatar && (
                    <p
                      className="mb-1 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                      style={{
                        borderColor: `${selectedAvatar.accent}55`,
                        color: selectedAvatar.accent,
                      }}
                    >
                      {selectedAvatar.category}
                    </p>
                  )}
                </div>

                <h3 className="mt-3 text-lg font-semibold text-white">{user.name}</h3>
                <p className="mt-0.5 break-all text-sm text-slate-400">{user.email}</p>

                <ul className="mt-5 grid grid-cols-3 divide-x divide-blue-200/10 rounded-lg border border-blue-200/10 bg-[#0a2037]/70 py-3">
                  {['Juegos favoritos', 'Alertas', 'Ofertas'].map((label) => (
                    <li className="px-2 text-center" key={label}>
                      <p className="text-xs font-medium text-slate-200">{label}</p>
                      <p className="mt-1 text-[11px] text-slate-500">Sin datos</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-blue-300/10 bg-[#071a2d]/80 px-4 py-3 text-xs leading-5 text-slate-400">
              El espacio de portada queda reservado; las imágenes correspondientes se agregarán más adelante. Al guardar, el avatar elegido se actualizará también en el navbar.
            </div>

            {errorMessage && (
              <p
                className="mt-4 rounded-lg border border-red-400/20 bg-red-950/40 px-4 py-3 text-sm text-red-200"
                role="alert"
              >
                {errorMessage}
              </p>
            )}
            {successMessage && (
              <p
                className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
                role="status"
              >
                {successMessage}
              </p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-lg border border-blue-400/50 px-5 py-2.5 text-sm font-semibold text-sky-300 transition hover:bg-blue-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSaving}
                onClick={handleCancel}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!selectedAvatarId || !hasChanges || isSaving}
                onClick={handleSave}
                type="button"
              >
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default ProfileCustomization
