import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useTheme } from '../context/useTheme'

type LoginIconName = 'search' | 'tag' | 'bell' | 'mail' | 'lock'

function LoginIcon({ name }: { name: LoginIconName }) {
  const paths: Record<LoginIconName, ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m16 16 4 4" />
      </>
    ),
    tag: (
      <>
        <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
        <circle cx="7.5" cy="7.5" r="1" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 1 1 8 0v3m-4 5v2" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  )
}

const loginBenefits: { icon: LoginIconName; title: string; description: string }[] = [
  {
    icon: 'search',
    title: 'Compara precios',
    description: 'en las principales tiendas digitales.',
  },
  {
    icon: 'tag',
    title: 'Encuentra ofertas',
    description: 'y descuentos exclusivos.',
  },
  {
    icon: 'bell',
    title: 'Recibe alertas',
    description: 'cuando el precio que buscas baje.',
  },
]

function Login() {
  const { theme } = useTheme()
  const darkBackgroundPosition = 'calc(50% + 4px) center'

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
      <div className="hero-overlay-secondary absolute inset-0 -z-10" aria-hidden="true" />

      <Navbar overlay />

      <section className="mx-auto flex min-h-[calc(100vh-81px)] items-center justify-center px-5 py-8 sm:px-8">
        <div className="grid w-full max-w-[680px] overflow-hidden rounded-xl border border-white/15 shadow-2xl shadow-slate-950/50 md:min-h-[470px] md:-translate-y-[19px] md:grid-cols-[1.08fr_.92fr]">
          <div className="relative hidden flex-col justify-center overflow-hidden bg-slate-950 p-7 text-white md:flex lg:p-[38px]">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-55"
              style={{ backgroundImage: "url('/home-fondo.jpg')" }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-gradient-to-br from-slate-950/55 via-blue-950/60 to-slate-950/80"
              aria-hidden="true"
            />
            <div className="relative">
              <Link className="inline-flex items-center gap-3" to="/" aria-label="GamePriceTracker inicio">
                <svg aria-hidden="true" className="h-12 w-12 shrink-0 text-white" viewBox="0 0 32 32" fill="currentColor">
                  <path d="M8.2 8.4c-2.2 0-4.1 1.5-4.8 3.6L1.6 20c-.7 2.7 2.4 4.7 4.7 3.1l4-2.8h11.4l4 2.8c2.3 1.6 5.4-.4 4.7-3.1l-1.8-8c-.7-2.1-2.6-3.6-4.8-3.6H8.2Zm2 3.1a1 1 0 0 1 1 1v1.2h1.2a1 1 0 1 1 0 2h-1.2v1.2a1 1 0 1 1-2 0v-1.2H8a1 1 0 1 1 0-2h1.2v-1.2a1 1 0 0 1 1-1Zm10.2 1.1a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Zm3.2 2.3a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z" />
                </svg>
                <span className="text-xl font-bold tracking-tight">
                  GamePrice<span className="text-blue-400">Tracker</span>
                </span>
              </Link>

              <h1 className="mt-8 max-w-sm text-[22px] font-bold leading-[1.2]">
                Encuentra los <span className="text-blue-400">mejores precios</span> de tus
                videojuegos
              </h1>
              <p className="mt-4 max-w-sm text-[12px] leading-[1.55] text-slate-300">
                Compara precios, descubre ofertas y recibe alertas para no pagar de más. Todo en un solo lugar.
              </p>

              <ul className="mt-7 space-y-3.5">
                {loginBenefits.map((benefit) => (
                  <li className="flex items-center gap-3" key={benefit.title}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/25">
                      <LoginIcon name={benefit.icon} />
                    </span>
                    <span className="text-[12px]">
                      <span className="block font-semibold text-white">{benefit.title}</span>
                      <span className="mt-0.5 block text-[10px] text-slate-300">
                        {benefit.description}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center bg-[#fbfbfd] px-6 py-7 text-slate-900 sm:px-[30px]">
            <div className="mx-auto w-full max-w-sm">
              <Link
                className="text-sm font-medium text-blue-600 transition hover:text-blue-700 md:hidden"
                to="/"
              >
                ← Volver al inicio
              </Link>
              <div className="mt-2 md:mt-0">
                <h2 className="text-[21px] font-bold tracking-tight">Iniciar sesión</h2>
                <p className="mt-1.5 text-[11px] leading-[1.55] text-slate-500">
                  Accedé a tu cuenta para gestionar tu lista de deseados y recibir alertas de precios.
                </p>
              </div>

              <form
                className="mt-3 space-y-3"
                onSubmit={(event) => event.preventDefault()}
              >
                <label className="block text-xs font-semibold text-slate-700" htmlFor="email">
                  Correo electrónico
                  <span className="relative mt-1.5 block">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <LoginIcon name="mail" />
                    </span>
                    <input
                      autoComplete="email"
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-[11px] font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                      id="email"
                      name="email"
                      placeholder="tucorreo@ejemplo.com"
                      type="email"
                    />
                  </span>
                </label>

                <label className="block text-xs font-semibold text-slate-700" htmlFor="password">
                  Contraseña
                  <span className="relative mt-1.5 block">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <LoginIcon name="lock" />
                    </span>
                    <input
                      autoComplete="current-password"
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-[11px] font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                      id="password"
                      name="password"
                      placeholder="Ingresa tu contraseña"
                      type="password"
                    />
                  </span>
                </label>

                <div className="flex justify-end">
                  <button
                    className="text-[10px] font-medium text-blue-600 transition hover:text-blue-700"
                    type="button"
                    disabled
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <button
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-[11px] font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                  type="submit"
                >
                  Iniciar sesión
                  <span aria-hidden="true">→</span>
                </button>
              </form>

              <div className="my-3 flex items-center gap-3 text-[10px] text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                o continúa con
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-medium text-slate-600"
                  type="button"
                  disabled
                >
                  <span className="font-bold text-base text-blue-600" aria-hidden="true">G</span>
                  Google
                </button>
                <button
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-medium text-slate-600"
                  type="button"
                  disabled
                >
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-[10px] text-white" aria-hidden="true">
                    S
                  </span>
                  Steam
                </button>
              </div>

              <p className="mt-5 text-center text-[10px] text-slate-500">
                ¿No tenés una cuenta?{' '}
                <button className="font-semibold text-blue-600" type="button" disabled>
                  Registrate
                </button>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Login
