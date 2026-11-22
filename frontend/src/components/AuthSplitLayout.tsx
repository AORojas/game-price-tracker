import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Navbar from './Navbar'
import { useTheme } from '../context/useTheme'

type AuthBenefitIcon = 'search' | 'tag' | 'bell'

const authBenefits: { icon: AuthBenefitIcon; title: string; description: string }[] = [
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

function BenefitIcon({ name }: { name: AuthBenefitIcon }) {
  const paths: Record<AuthBenefitIcon, ReactNode> = {
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

function AuthSplitLayout({ children }: { children: ReactNode }) {
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
        <div className="grid w-full max-w-[680px] overflow-hidden rounded-xl border border-[var(--color-border)] shadow-2xl shadow-slate-950/50 md:min-h-[470px] md:-translate-y-[19px] md:grid-cols-[1.08fr_.92fr]">
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
              <Link
                className="inline-flex items-center gap-3"
                to="/"
                aria-label="GamePriceTracker inicio"
              >
                <img
                  alt=""
                  aria-hidden="true"
                  className="h-12 w-12 shrink-0 object-contain"
                  src="/gamepricetracker-icon.png"
                />
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
                {authBenefits.map((benefit) => (
                  <li className="flex items-center gap-3" key={benefit.title}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/25">
                      <BenefitIcon name={benefit.icon} />
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

          <div className="flex items-center bg-[var(--color-surface)] px-6 py-7 text-[var(--color-text)] sm:px-[30px]">
            {children}
          </div>
        </div>
      </section>
    </main>
  )
}

export default AuthSplitLayout
