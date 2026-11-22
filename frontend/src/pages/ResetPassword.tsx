import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthSplitLayout from '../components/AuthSplitLayout'
import { useAuth } from '../context/useAuth'
import { resetPassword } from '../services/authService'

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshSession } = useAuth()
  const token = searchParams.get('token') ?? ''
  const hasValidToken = /^[\da-f]{64}$/i.test(token)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    const formData = new FormData(event.currentTarget)
    const password = String(formData.get('password') ?? '')
    const confirmation = String(formData.get('password-confirmation') ?? '')
    if (password.length < 8 || password.length > 128) {
      setErrorMessage('La contraseña debe tener entre 8 y 128 caracteres.')
      return
    }
    if (password !== confirmation) {
      setErrorMessage('Las contraseñas no coinciden.')
      return
    }

    setIsSubmitting(true)
    try {
      await resetPassword(token, password)
      await refreshSession()
      navigate('/login', {
        replace: true,
        state: { passwordResetSuccess: true },
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo restablecer la contraseña.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthSplitLayout>
      <div className="mx-auto w-full max-w-sm">
        <Link
          className="text-[10px] font-medium text-blue-600 transition hover:text-blue-700"
          to="/login"
        >
          ← Volver a iniciar sesión
        </Link>
          <h1 className="mt-2 text-[21px] font-bold tracking-tight md:mt-0">
            Crear nueva contraseña
          </h1>
          <p className="mt-1.5 text-[11px] leading-[1.55] text-[var(--color-text-muted)]">
            Elige una contraseña de al menos 8 caracteres.
          </p>

          {!hasValidToken ? (
            <div className="mt-3 space-y-3">
              <p className="rounded-lg bg-[var(--color-status-error-bg)] px-3 py-2 text-xs text-[var(--color-status-error)]" role="alert">
                El enlace no es válido. Solicita uno nuevo para continuar.
              </p>
              <Link
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-[11px] font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                to="/forgot-password"
              >
                Solicitar otro enlace
              </Link>
            </div>
          ) : (
            <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
              <label className="block text-xs font-semibold" htmlFor="new-password">
                Nueva contraseña
                <input
                  autoComplete="new-password"
                  className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-[11px] font-normal text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                  id="new-password"
                  maxLength={128}
                  minLength={8}
                  name="password"
                  required
                  type="password"
                />
              </label>

              <label
                className="block text-xs font-semibold"
                htmlFor="password-confirmation"
              >
                Confirmar contraseña
                <input
                  autoComplete="new-password"
                  className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-[11px] font-normal text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                  id="password-confirmation"
                  maxLength={128}
                  minLength={8}
                  name="password-confirmation"
                  required
                  type="password"
                />
              </label>

              {errorMessage && (
                <p
                  className="rounded-lg bg-[var(--color-status-error-bg)] px-3 py-2 text-xs text-[var(--color-status-error)]"
                  role="alert"
                >
                  {errorMessage}
                </p>
              )}

              <button
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-[11px] font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar nueva contraseña'}
              </button>
            </form>
          )}
      </div>
    </AuthSplitLayout>
  )
}

export default ResetPassword
