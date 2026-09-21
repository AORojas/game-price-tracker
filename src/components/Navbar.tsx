import { Link } from 'react-router-dom'

function Navbar() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between border-b border-white/10 px-6 py-5 lg:px-10">
      <Link
        to="/"
        className="flex items-center gap-3"
        aria-label="GamePriceTracker inicio"
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
      </div>
    </header>
  )
}

export default Navbar
