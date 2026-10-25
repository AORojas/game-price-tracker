import { useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/useTheme'
import { useAuth } from '../context/useAuth'
import { getProfileAvatar } from '../data/profileAvatars'

type NavbarProps = {
  overlay?: boolean
}

function Navbar({ overlay = false }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const userAvatar = getProfileAvatar(user?.avatarId ?? null)
  const overlayText = overlay ? 'text-white' : 'text-[var(--color-text)]'
  const overlayMutedText = overlay ? 'text-slate-200' : 'text-[var(--color-text-muted)]'
  const overlayBorder = overlay ? 'border-white/15' : 'border-[var(--color-border)]'

  function closeMenu() {
    setIsMenuOpen(false)
  }

  async function handleLogout() {
    await logout()
    setIsProfileDropdownOpen(false)
    navigate('/')
  }

  function toggleProfileDropdown() {
    setIsProfileDropdownOpen(!isProfileDropdownOpen)
  }

  return (
    <header className={`theme-transition relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-between border-b px-6 py-5 lg:px-10 ${overlayBorder}`}>
      <Link
        to="/"
        className="flex items-center gap-3"
        aria-label="GamePriceTracker inicio"
        onClick={closeMenu}
      >
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/15 text-xl text-blue-300 ring-1 ring-inset ring-blue-300/30">
          🎮
        </span>
        <span className={`text-lg font-bold tracking-tight ${overlayText}`}>
          GamePrice<span className="text-blue-400">Tracker</span>
        </span>
      </Link>

      <nav
        className={`hidden items-center gap-8 text-sm md:flex ${overlayMutedText}`}
        aria-label="Navegación principal"
      >
        <NavLink
          className={({ isActive }) =>
            `transition hover:text-blue-500 ${isActive ? overlayText : overlayMutedText}`
          }
          to="/"
        >
          Inicio
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `transition hover:text-blue-500 ${isActive ? overlayText : overlayMutedText}`
          }
          to="/explorar"
        >
          Explorar
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `transition hover:text-blue-500 ${isActive ? overlayText : overlayMutedText}`
          }
          to="/mi-lista"
        >
          Mi lista
        </NavLink>
      </nav>

      <div className="flex items-center gap-3 text-sm">
        <button
          className={`grid h-10 w-10 place-items-center rounded-lg border text-lg transition hover:border-blue-400 ${overlayBorder} ${overlayText}`}
          type="button"
          aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            '☾'
          )}
        </button>

        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              className={`grid h-10 w-10 place-items-center overflow-hidden rounded-full border font-semibold transition hover:border-blue-400 ${overlayBorder} ${overlayText}`}
              type="button"
              aria-expanded={isProfileDropdownOpen}
              aria-controls="profile-dropdown"
              aria-label={`Menú de perfil de ${user.name}`}
              onClick={toggleProfileDropdown}
            >
              {userAvatar ? (
                <img
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full scale-110 object-cover"
                  src={userAvatar.avatarPath}
                />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </button>

            {isProfileDropdownOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/95 shadow-xl backdrop-blur-md"
                id="profile-dropdown"
              >
                <div className="px-4 py-3 border-b border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-muted)]">Sesión iniciada como</p>
                  <p className="font-semibold text-[var(--color-text)]">{user.email}</p>
                </div>
                <nav className="flex flex-col gap-1 p-2">
                  <Link
                    to="/perfil"
                    className="rounded-lg px-3 py-2 text-sm transition hover:bg-[var(--color-surface-muted)]"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  >
                    Perfil
                  </Link>
                  <button
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-500 transition hover:bg-red-500/10"
                    type="button"
                    onClick={handleLogout}
                  >
                    Cerrar sesión
                  </button>
                </nav>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link
              className={`hidden rounded-lg px-3 py-2 transition sm:block ${overlayMutedText} hover:text-blue-500`}
              to="/login"
            >
              Iniciar sesión
            </Link>
            <button
              className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400"
              type="button"
              onClick={() => navigate('/login', { state: { mode: 'register' } })}
            >
              Registrarse
            </button>
          </>
        )}

        <button
          className={`grid h-10 w-10 place-items-center rounded-lg border text-xl transition hover:border-blue-300/60 md:hidden ${overlayBorder} ${overlayText}`}
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
          aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
        >
          {isMenuOpen ? '×' : '☰'}
        </button>
      </div>

      {isMenuOpen && (
        <nav
          className="absolute right-6 top-full z-50 w-[calc(100%-3rem)] pt-5 md:hidden lg:right-10 lg:w-[calc(100%-5rem)]"
          id="mobile-navigation"
          aria-label="Navegación móvil"
        >
          <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-3 text-sm text-[var(--color-text)] shadow-xl backdrop-blur-md">
            <Link
              className="rounded-lg px-3 py-3 transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
              to="/"
              onClick={closeMenu}
            >
              Inicio
            </Link>
            <Link
              className="rounded-lg px-3 py-3 transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
              to="/explorar"
              onClick={closeMenu}
            >
              Explorar
            </Link>
            <Link
              className="rounded-lg px-3 py-3 transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
              to="/mi-lista"
              onClick={closeMenu}
            >
              Mi lista
            </Link>
            {!user && (
              <>
                <Link
                  className="rounded-lg px-3 py-3 text-left transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
                  to="/login"
                  onClick={closeMenu}
                >
                  Iniciar sesión
                </Link>
                <Link
                  className="rounded-lg bg-blue-500 px-3 py-3 text-center font-semibold text-white transition hover:bg-blue-400"
                  to="/login"
                  onClick={closeMenu}
                >
                  Registrarse
                </Link>
              </>
            )}
            {user && (
              <>
                <hr className="my-1 border-[var(--color-border)]" />
                <Link
                  className="rounded-lg px-3 py-3 text-left transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
                  to="/perfil"
                  onClick={closeMenu}
                >
                  Perfil
                </Link>
                <button
                  className="w-full rounded-lg px-3 py-3 text-left text-red-500 transition hover:bg-red-500/10"
                  type="button"
                  onClick={() => {
                    handleLogout()
                    closeMenu()
                  }}
                >
                  Cerrar sesión
                </button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}

export default Navbar
