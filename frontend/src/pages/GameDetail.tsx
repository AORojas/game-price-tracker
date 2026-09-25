import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { games } from '../data/games'

function formatPrice(price: number) {
  return price === 0 ? 'Gratis' : `$${price.toFixed(2)}`
}

function getDiscount(price: number, originalPrice: number) {
  if (originalPrice === 0) return 0
  return Math.round((1 - price / originalPrice) * 100)
}

function GameDetail() {
  const { gameTitle } = useParams()
  const game = games.find((item) => item.title === decodeURIComponent(gameTitle ?? ''))

  if (!game) {
    return (
      <main className="theme-transition min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar />
        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h1 className="text-3xl font-bold">Videojuego no encontrado</h1>
          <p className="mt-3 text-[var(--color-text-muted)]">
            No pudimos encontrar la ficha solicitada.
          </p>
          <Link className="mt-8 inline-block rounded-lg bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-400" to="/explorar">
            Volver a explorar
          </Link>
        </section>
      </main>
    )
  }

  const discount = getDiscount(game.price, game.originalPrice)

  return (
    <main className="theme-transition min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-8 lg:px-10 lg:py-12">
        <Link className="text-sm text-[var(--color-text-muted)] transition hover:text-blue-500" to="/explorar">
          ← Volver a explorar
        </Link>
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <img
            className="h-72 w-full rounded-2xl object-cover shadow-xl shadow-black/20 sm:h-96"
            src={game.image}
            alt={`Portada de ${game.title}`}
          />
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-500">{game.category}</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{game.title}</h1>
            <p className="mt-4 text-[var(--color-text-muted)]">Disponible en {game.store}</p>
            <p className="mt-6 max-w-2xl leading-7 text-[var(--color-text-muted)]">{game.description}</p>
            <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <p className="text-sm text-[var(--color-text-muted)]">Mejor precio encontrado</p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <span className="text-4xl font-bold">{formatPrice(game.price)}</span>
                {game.originalPrice > 0 && (
                  <span className="pb-1 text-lg text-[var(--color-text-muted)] line-through">
                    {formatPrice(game.originalPrice)}
                  </span>
                )}
                {discount > 0 && (
                  <span className="mb-1 rounded-full bg-emerald-400 px-3 py-1 text-sm font-bold text-emerald-950">
                    -{discount}%
                  </span>
                )}
              </div>
              <button className="mt-6 w-full rounded-lg bg-blue-500 py-3 font-semibold text-white transition hover:bg-blue-400" type="button">
                Ver oferta
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default GameDetail
