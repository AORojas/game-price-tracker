import Navbar from '../components/Navbar'
import SearchBar from '../components/SearchBar'
import { useTheme } from '../context/useTheme'

function Home() {
  const { theme } = useTheme()
  const darkBackgroundPosition = 'calc(50% + 4px) center'

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--color-bg)] text-white">
      <section className="relative isolate min-h-screen">
        <div
          className={`absolute inset-0 -z-20 bg-cover transition-opacity duration-300 ease-in-out ${
            theme === 'dark' ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: "url('/home-fondo.jpg')",
            backgroundPosition: darkBackgroundPosition,
          }}
        />
        <div
          className={`absolute inset-0 -z-20 bg-cover bg-center transition-opacity duration-300 ease-in-out ${
            theme === 'light' ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: "url('/home-fondo-claro.jpg')",
          }}
        />
        <div className="hero-overlay absolute inset-0 -z-10" />
        <div className="hero-overlay-secondary absolute inset-0 -z-10" />

        <Navbar overlay />

        <div className="mx-auto flex min-h-[calc(100vh-81px)] max-w-5xl items-center justify-center px-6 py-20 text-center lg:px-10">
          <div className="w-full">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.35em] text-blue-300 sm:text-sm">
              Encuentra. Compara. Ahorra.
            </p>
            <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Tu buscador de precios
              <span className="block bg-gradient-to-r from-blue-300 via-blue-500 to-cyan-300 bg-clip-text text-transparent py-2">
                de videojuegos
              </span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Compara precios, descubre las mejores ofertas y encuentra tu
              próximo videojuego al mejor precio.
            </p>

            <SearchBar />
          </div>
        </div>
      </section>
    </main>
  )
}

export default Home
