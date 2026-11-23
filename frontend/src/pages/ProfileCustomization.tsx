import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BackToTopButton from '../components/BackToTopButton'
import Navbar from '../components/Navbar'
import { useToast } from '../context/useToast'
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

  return <CustomizationForm key={user.id} user={user} />
}

function CustomizationForm({ user }: { user: AuthUser }) {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { saveAvatar } = useAuth()
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(
    user.avatarId,
  )
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>('Todos')
  const [isSaving, setIsSaving] = useState(false)

  const selectedAvatar =
    profileAvatars.find((avatar) => avatar.id === selectedAvatarId) ?? null
  const filteredAvatars =
    activeCategory === 'Todos'
      ? profileAvatars
      : profileAvatars.filter((avatar) => avatar.category === activeCategory)
  const hasChanges = selectedAvatarId !== user.avatarId

  async function handleSave() {
    if (!selectedAvatarId || !hasChanges || isSaving) return

    setIsSaving(true)
    try {
      await saveAvatar(selectedAvatarId)
      showToast('Tu avatar se guardó correctamente.', 'success')
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el avatar. Inténtalo nuevamente.',
        'error',
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
    <>
    <main className="relative isolate min-h-screen w-full max-w-full overflow-x-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
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

      <Navbar overlay />

      <div className="mx-auto w-full min-w-0 max-w-[1440px] overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(350px,.95fr)]">
          <section className="min-w-0 max-w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xl shadow-slate-950/25 backdrop-blur-sm sm:p-5">
            <header className="flex items-start gap-3 border-b border-[var(--color-border)] pb-5">
              <Link
                aria-label="Volver al perfil"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-500/10 text-xl text-[var(--color-accent)] transition hover:bg-blue-500/20"
                to="/perfil"
              >
                ←
              </Link>
              <div className="min-w-0">
                <h1 className="text-xl font-bold sm:text-2xl">
                  Personalizar perfil
                </h1>
                <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
                  Elegí un avatar y su portada correspondiente cambiará en la vista previa.
                </p>
              </div>
            </header>

            <div className="mt-5">
              <h2 className="text-base font-semibold">Elegí tu avatar</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                La selección se guarda solo cuando confirmas los cambios.
              </p>

              <div
                aria-label="Filtrar avatares por categoría"
                className="mt-4 flex max-w-full flex-wrap gap-2 px-1 pb-2"
              >
                {categories.map((category) => (
                  <button
                    aria-pressed={activeCategory === category}
                    className={`shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition ${
                      activeCategory === category
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:border-blue-300/30'
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
                className="mt-3 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4"
                role="radiogroup"
              >
                {filteredAvatars.map((avatar) => {
                  const isSelected = avatar.id === selectedAvatarId
                  return (
                    <button
                      aria-checked={isSelected}
                      aria-label={`${avatar.name}, ${avatar.category}`}
                      className={`group relative aspect-square min-w-0 overflow-hidden rounded-xl border-2 bg-[var(--color-surface-muted)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                        isSelected
                          ? 'border-blue-400 shadow-lg shadow-blue-900/40'
                          : 'border-blue-200/10 hover:border-blue-300/50'
                      }`}
                      key={avatar.id}
                      onClick={() => {
                        setSelectedAvatarId(avatar.id)
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
                      <span className="absolute inset-x-0 bottom-0 z-10 line-clamp-2 break-words bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent px-2 pb-2 pt-7 text-left text-[11px] font-medium text-white">
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

          <section className="min-w-0 max-w-full">
            <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl shadow-slate-950/25 backdrop-blur-sm">
              <div className="flex items-center gap-2 px-5 pt-5">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 text-[var(--color-accent)]"
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
                className="relative mx-4 mt-4 h-36 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] sm:h-40"
                aria-label={
                  selectedAvatar
                    ? `Vista previa de la portada para ${selectedAvatar.name}`
                    : 'Selecciona un avatar para ver su portada'
                }
                role="img"
              >
                {selectedAvatar ? (
                  <>
                    <img
                      alt=""
                      className="h-full w-full object-cover"
                      src={selectedAvatar.coverPath}
                    />
                    <span className="absolute inset-0 bg-gradient-to-r from-slate-950/30 via-transparent to-slate-950/15" />
                  </>
                ) : (
                  <span className="grid h-full place-items-center px-5 text-center text-sm text-[var(--color-text-muted)]">
                    Selecciona un avatar para ver su portada
                  </span>
                )}
              </div>

              <div className="px-5 pb-5">
                <div className="-mt-7 flex items-end gap-3">
                  <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-[var(--color-surface)] bg-blue-600 text-xl font-bold text-white shadow-lg shadow-blue-950/40">
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

                <h3 className="mt-3 text-lg font-semibold text-[var(--color-text)]">{user.name}</h3>
                <p className="mt-0.5 break-all text-sm text-[var(--color-text-muted)]">{user.email}</p>

                <ul className="mt-5 grid grid-cols-3 divide-x divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] py-3">
                  {['Juegos favoritos', 'Alertas', 'Ofertas'].map((label) => (
                    <li className="px-2 text-center" key={label}>
                      <p className="text-xs font-medium text-[var(--color-text)]">{label}</p>
                      <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">Sin datos</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 min-w-0 break-words rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-xs leading-5 text-[var(--color-text-muted)]">
              La portada cambia junto con el avatar en la vista previa. Al guardar, ambos quedan asociados a tu perfil y el avatar también se actualiza en el navbar.
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-lg border border-blue-400/50 px-5 py-2.5 text-sm font-semibold text-[var(--color-accent)] transition hover:bg-blue-400/10 disabled:cursor-not-allowed disabled:opacity-50"
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
    <BackToTopButton />
    </>
  )
}

export default ProfileCustomization
