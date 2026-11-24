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
    <header className={`theme-transition relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 border-b px-4 sm:px-6 lg:px-10 ${isMenuOpen || isProfileDropdownOpen ? 'z-50' : 'z-40'} ${overlayBorder}`}>
      <Link
        to="/"
        className="flex shrink-0 items-center gap-2 sm:gap-3"
        aria-label="GamePriceTracker inicio"
        onClick={closeMenu}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-500/15 p-1 ring-1 ring-inset ring-blue-300/30 sm:h-10 sm:w-10">
          <img
            alt=""
            className="h-full w-full object-contain"
            src="/gamepricetracker-icon.png"
          />
        </span>
        <span className={`whitespace-nowrap text-lg font-bold tracking-tight sm:text-xl ${overlayText}`}>
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

      <div className="flex shrink-0 items-center gap-2 text-sm">
        <button
          className={`grid h-9 w-9 place-items-center rounded-lg border text-lg transition hover:border-blue-400 md:h-10 md:w-10 ${overlayBorder} ${overlayText}`}
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
          <div className="relative hidden md:block" ref={dropdownRef}>
            <button
              className={`grid h-10 w-10 place-items-center overflow-hidden rounded-full border font-semibold transition hover:border-blue-400 ${overlayBorder} ${overlayText}`}
              type="button"
              aria-expanded={isProfileDropdownOpen}
              aria-controls="profile-dropdown"
              aria-label={`Menú de perfil de ${user.name}`}
              onClick={toggleProfileDropdown}
            >
              {userAvatar || user.avatarUrl ? (
                <img
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full scale-110 object-cover"
                  src={userAvatar?.avatarPath ?? user.avatarUrl ?? ''}
                />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </button>

            {isProfileDropdownOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
                id="profile-dropdown"
              >
                <div className="px-4 py-3 border-b border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-muted)]">Sesión iniciada como</p>
                  <p
                    className="block max-w-full truncate font-semibold text-[var(--color-text)]"
                    title={user.email}
                  >
                    {user.email}
                  </p>
                </div>
                <nav className="flex flex-col gap-1 p-2 text-[var(--color-text)]">
                  <Link
                    to="/perfil"
                    className="rounded-lg px-3 py-2 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  >
                    Perfil
                  </Link>
                  <button
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--color-status-error)] transition hover:bg-[var(--color-status-error-bg)]"
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
              className={`hidden rounded-lg px-3 py-2 transition md:block ${overlayMutedText} hover:text-blue-500`}
              to="/login"
            >
              Iniciar sesión
            </Link>
            <button
              className="hidden rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 md:block"
              type="button"
              onClick={() => navigate('/login', { state: { mode: 'register' } })}
            >
              Registrarse
            </button>
          </>
        )}

        <button
          className={`grid h-9 w-9 place-items-center rounded-lg border text-xl transition hover:border-blue-300/60 md:hidden ${overlayBorder} ${overlayText}`}
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
          className="absolute right-4 top-full z-50 w-[calc(100%-2rem)] pt-5 sm:right-6 sm:w-[calc(100%-3rem)] md:hidden"
          id="mobile-navigation"
          aria-label="Navegación móvil"
        >
          <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text)] shadow-xl">
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
                  state={{ mode: 'register' }}
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
