import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useTheme } from '../context/useTheme'
import { useAuth } from '../context/useAuth'

function Profile() {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()
  const darkBackgroundPosition = 'calc(50% + 4px) center'

  // Redirigir al login si no hay usuario
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login')
    }
  }, [user, isLoading, navigate])

  if (isLoading) {
    return (
      <main className="min-h-screen overflow-hidden bg-[var(--color-bg)] text-white">
        <Navbar />
        <div className="flex min-h-[calc(100vh-81px)] items-center justify-center">
          <p className="text-sm text-[var(--color-text-muted)]">Cargando perfil...</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[var(--color-bg)] text-white">
      <div
        className={`absolute inset-0 -z-20 bg-cover transition-opacity duration-300 ease-in-out ${
          theme === 'dark' ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundImage: "url('/home-fondo.jpg')",
          backgroundPosition: darkBackgroundPosition,
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

      <div className="mx-auto max-w-3xl px-6 py-12 lg:px-10">
        {/* Profile Header */}
        <section className="mb-8 rounded-xl border border-white/15 bg-slate-950/50 backdrop-blur-sm p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-blue-400/30 bg-blue-500/20 text-3xl font-bold text-blue-300">
              {user.name.charAt(0).toUpperCase()}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl font-bold text-white">{user.name}</h1>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{user.email}</p>
              <p className="mt-3 text-xs text-[var(--color-text-muted)]">
                ID: <span className="font-mono text-[10px]">{user.id}</span>
              </p>
            </div>
          </div>
        </section>

        {/* Personal Information */}
        <section className="rounded-xl border border-white/15 bg-slate-950/50 backdrop-blur-sm p-8">
          <h2 className="text-xl font-bold text-white mb-6">Información personal</h2>

          <div className="space-y-6">
            {/* Name Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                Nombre
              </label>
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white">
                {user.name}
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                Correo electrónico
              </label>
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white break-all">
                {user.email}
              </div>
            </div>

            {/* User ID Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                Identificador de usuario
              </label>
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white font-mono text-sm break-all">
                {user.id}
              </div>
            </div>
          </div>
        </section>

        {/* Placeholder for future sections */}
        <div className="mt-8 rounded-xl border border-dashed border-white/10 p-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            Más opciones de perfil disponibles próximamente
          </p>
        </div>
      </div>
    </main>
  )
}

export default Profile
