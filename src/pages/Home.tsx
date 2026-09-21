import Navbar from '../components/Navbar'
import SearchBar from '../components/SearchBar'

function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#071323] text-white">
      <section className="relative isolate min-h-screen">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: "url('/home-fondo.jpg')" }}
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(3,13,28,0.94)_0%,rgba(4,17,34,0.78)_48%,rgba(3,13,28,0.9)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_38%,rgba(23,103,193,0.24),transparent_46%),linear-gradient(180deg,rgba(4,15,30,0.18)_0%,rgba(3,10,22,0.74)_100%)]" />

        <Navbar />

        <div className="mx-auto flex min-h-[calc(100vh-81px)] max-w-5xl items-center justify-center px-6 py-20 text-center lg:px-10">
          <div className="w-full">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.35em] text-blue-300 sm:text-sm">
              Encuentra. Compara. Ahorra.
            </p>
            <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
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
