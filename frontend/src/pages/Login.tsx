import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import AuthSplitLayout from '../components/AuthSplitLayout'
import { useAuth } from '../context/useAuth'
import {
  loginUser,
  loginWithGoogle,
  registerUser,
} from '../services/authService'

type LoginIconName = 'mail' | 'lock'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()

function LoginIcon({ name }: { name: LoginIconName }) {
  const paths: Record<LoginIconName, ReactNode> = {
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

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isLoading, refreshSession } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState(() => {
    const state = location.state as { passwordResetSuccess?: boolean } | null
    return state?.passwordResetSuccess
      ? 'Tu contraseña se actualizó. Ya puedes iniciar sesión.'
      : ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Detectar si vino con estado de "register" desde el navbar
  useEffect(() => {
    const state = location.state as
      | { mode?: string; passwordResetSuccess?: boolean }
      | null
    if (state?.mode === 'register') {
      setMode('register')
    }
  }, [location.state])

  // Si ya está autenticado, redirigir a home
  useEffect(() => {
    if (user && !isLoading) {
      navigate('/')
    }
  }, [user, isLoading, navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    try {
      mode === 'register'
        ? await registerUser(name, email, password)
        : await loginUser(email, password)
      
      // Refrescar el estado global de autenticación
      await refreshSession()
      // La navegación se hace automáticamente en el useEffect anterior
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo completar la autenticación.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleCredential(idToken?: string) {
    if (!idToken) {
      setErrorMessage('Google no devolvió un token de identidad válido.')
      return
    }
    setErrorMessage('')
    setSuccessMessage('')
    setIsSubmitting(true)
    try {
      await loginWithGoogle(idToken)
      await refreshSession()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo iniciar sesión con Google.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthSplitLayout>
      <div className="mx-auto w-full max-w-sm">
              <Link
                className="text-sm font-medium text-blue-600 transition hover:text-blue-700 md:hidden"
                to="/"
              >
                ← Volver al inicio
              </Link>
              {isLoading ? (
                <p className="py-12 text-center text-sm text-[var(--color-text-muted)]" role="status">
                  Comprobando sesión...
                </p>
              ) : (
                <>
                  <div className="mt-2 md:mt-0">
                    <h2 className="text-[21px] font-bold tracking-tight">
                      {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                    </h2>
                    <p className="mt-1.5 text-[11px] leading-[1.55] text-[var(--color-text-muted)]">
                      {mode === 'login'
                        ? 'Accedé a tu cuenta para gestionar tu lista de deseados y recibir alertas de precios.'
                        : 'Crea una cuenta para guardar tus juegos y ofertas favoritas.'}
                    </p>
                  </div>

                  <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
                    {mode === 'register' && (
                      <label className="block text-xs font-semibold text-[var(--color-text)]" htmlFor="name">
                        Nombre
                        <input
                          autoComplete="name"
                          className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-[11px] font-normal text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                          id="name"
                          maxLength={100}
                          name="name"
                          placeholder="Tu nombre"
                          required
                        />
                      </label>
                    )}

                    <label className="block text-xs font-semibold text-[var(--color-text)]" htmlFor="email">
                      Correo electrónico
                      <span className="relative mt-1.5 block">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--color-text-muted)]">
                          <LoginIcon name="mail" />
                        </span>
                        <input
                          autoComplete="email"
                          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] py-2 pl-10 pr-3 text-[11px] font-normal text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                          id="email"
                          maxLength={254}
                          name="email"
                          placeholder="tucorreo@ejemplo.com"
                          required
                          type="email"
                        />
                      </span>
                    </label>

                    <label className="block text-xs font-semibold text-[var(--color-text)]" htmlFor="password">
                      Contraseña
                      <span className="relative mt-1.5 block">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--color-text-muted)]">
                          <LoginIcon name="lock" />
                        </span>
                        <input
                          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] py-2 pl-10 pr-3 text-[11px] font-normal text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                          id="password"
                          maxLength={128}
                          minLength={8}
                          name="password"
                          placeholder="Mínimo 8 caracteres"
                          required
                          type="password"
                        />
                      </span>
                    </label>

                    {mode === 'login' && (
                      <div className="flex justify-center">
                        <Link
                          className="text-[10px] text-blue-600 transition hover:text-blue-500"
                          to="/forgot-password"
                        >
                          Recuperación de contraseña
                        </Link>
                      </div>
                    )}

                    {successMessage && (
                      <p
                        className="rounded-lg bg-[var(--color-status-success-bg)] px-3 py-2 text-xs text-[var(--color-status-success)]"
                        role="status"
                      >
                        {successMessage}
                      </p>
                    )}
                    {errorMessage && (
                      <p className="rounded-lg bg-[var(--color-status-error-bg)] px-3 py-2 text-xs text-[var(--color-status-error)]" role="alert">
                        {errorMessage}
                      </p>
                    )}

                    <button
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-[11px] font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? 'Procesando...'
                        : mode === 'login'
                          ? 'Iniciar sesión'
                          : 'Crear cuenta'}
                      {!isSubmitting && <span aria-hidden="true">→</span>}
                    </button>
                  </form>

                  {mode === 'login' && (
                    <>
                      <div className="my-3 flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
                        <span className="h-px flex-1 bg-[var(--color-border)]" />
                        o continúa con
                        <span className="h-px flex-1 bg-[var(--color-border)]" />
                      </div>

                      <div className="flex justify-center">
                        {googleClientId ? (
                          <div className="flex min-w-0 items-center justify-center overflow-hidden rounded-lg">
                           <GoogleLogin
                            onSuccess={(credentialResponse) =>
                              void handleGoogleCredential(credentialResponse.credential)
                            }
                            onError={() =>
                              setErrorMessage('No se pudo iniciar sesión con Google.')
                            }
                            shape="pill"
                            size="medium"
                            text="signin_with"
                            theme="outline"
                            width="150"
                          />
                          </div>
                        ) : (
                          <button
                            className="flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-[10px] font-medium text-[var(--color-text-muted)]"
                            type="button"
                            disabled
                            title="Configura VITE_GOOGLE_CLIENT_ID para habilitar Google"
                          >
                            <span className="font-bold text-base text-blue-600" aria-hidden="true">G</span>
                            Google
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  <p className="mt-5 text-center text-[10px] text-[var(--color-text-muted)]">
                    {mode === 'login' ? '¿No tenés una cuenta?' : '¿Ya tenés una cuenta?'}{' '}
                    <button
                      className="font-semibold text-blue-600"
                      type="button"
                      onClick={() => {
                        setMode(mode === 'login' ? 'register' : 'login')
                        setErrorMessage('')
                        setSuccessMessage('')
                      }}
                    >
                      {mode === 'login' ? 'Registrate' : 'Iniciá sesión'}
                    </button>
                  </p>
                </>
              )}
            </div>
    </AuthSplitLayout>
  )
}

export default Login
