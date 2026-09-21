import { useState } from 'react'
import { Link } from 'react-router-dom'

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  function closeMenu() {
    setIsMenuOpen(false)
  }

  return (
    <header className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-between border-b border-white/10 px-6 py-5 lg:px-10">
      <Link
        to="/"
        className="flex items-center gap-3"
        aria-label="GamePriceTracker inicio"
        onClick={closeMenu}
      >
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/15 text-xl text-blue-300 ring-1 ring-inset ring-blue-300/30">
          🎮
        </span>
        <span className="text-lg font-bold tracking-tight">
          GamePrice<span className="text-blue-400">Tracker</span>
        </span>
      </Link>

      <nav
        className="hidden items-center gap-8 text-sm text-slate-300 md:flex"
        aria-label="Navegación principal"
      >
        <Link className="text-white transition hover:text-blue-300" to="/">
          Inicio
        </Link>
        <Link className="transition hover:text-blue-300" to="/explorar">
          Explorar
        </Link>
        <Link className="transition hover:text-blue-300" to="/mi-lista">
          Mi lista
        </Link>
      </nav>

      <div className="flex items-center gap-3 text-sm">
        <button
          className="hidden rounded-lg px-3 py-2 text-slate-300 transition hover:text-white sm:block"
          type="button"
        >
          Iniciar sesión
        </button>
        <button
          className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400"
          type="button"
        >
          Registrarse
        </button>
        <button
          className="grid h-10 w-10 place-items-center rounded-lg border border-white/15 text-xl text-slate-200 transition hover:border-blue-300/60 hover:text-white md:hidden"
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
          <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-[#071323]/95 p-3 text-sm text-slate-200 shadow-xl backdrop-blur-md">
            <Link
              className="rounded-lg px-3 py-3 transition hover:bg-white/10 hover:text-white"
              to="/"
              onClick={closeMenu}
            >
              Inicio
            </Link>
            <Link
              className="rounded-lg px-3 py-3 transition hover:bg-white/10 hover:text-white"
              to="/explorar"
              onClick={closeMenu}
            >
              Explorar
            </Link>
            <Link
              className="rounded-lg px-3 py-3 transition hover:bg-white/10 hover:text-white"
              to="/mi-lista"
              onClick={closeMenu}
            >
              Mi lista
            </Link>
            <button
              className="rounded-lg px-3 py-3 text-left transition hover:bg-white/10 hover:text-white"
              type="button"
              onClick={closeMenu}
            >
              Iniciar sesión
            </button>
          </div>
        </nav>
      )}
    </header>
  )
}

export default Navbar
