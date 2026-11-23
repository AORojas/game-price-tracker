import { useState, type FormEvent } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { Link } from 'react-router-dom'
import AuthSplitLayout from '../components/AuthSplitLayout'
import { useToast } from '../context/useToast'
import { requestPasswordReset, recoverPasswordWithGoogle } from '../services/authService'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()

function ForgotPassword() {
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      showToast(await requestPasswordReset(email.trim()), 'success')
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'No se pudo solicitar la recuperación.',
        'error',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleCredential(credential?: string) {
    if (!credential) {
      showToast('Google no devolvió un token de identidad válido.', 'error')
      return
    }
    setIsSubmitting(true)
    try {
      const token = await recoverPasswordWithGoogle(credential)
      window.location.assign(`/reset-password?token=${encodeURIComponent(token)}`)
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : 'No se pudo verificar la cuenta de Google.',
        'error',
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
            Recuperar contraseña
          </h1>
          <p className="mt-1.5 text-[11px] leading-[1.55] text-[var(--color-text-muted)]">
            Te enviaremos un enlace al correo asociado a tu cuenta. También puedes
            verificar tu identidad con Google.
          </p>

          <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
            <label className="block text-xs font-semibold" htmlFor="recovery-email">
              Correo electrónico
              <input
                autoComplete="email"
                className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-[11px] font-normal text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                id="recovery-email"
                maxLength={254}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>

            <button
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-[11px] font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>
          </form>

          <div className="my-3 flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
            <span className="h-px flex-1 bg-[var(--color-border)]" />
            o verificá tu cuenta al instante
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
                    showToast('No se pudo verificar la cuenta con Google.', 'error')
                  }
                  shape="pill"
                  size="medium"
                  text="continue_with"
                  theme="outline"
                  width="150"
                />
              </div>
            ) : (
              <button
                className="flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-[10px] font-medium text-[var(--color-text-muted)]"
                disabled
                title="Configura VITE_GOOGLE_CLIENT_ID para habilitar Google"
                type="button"
              >
                Google no está configurado
              </button>
            )}
          </div>
      </div>
    </AuthSplitLayout>
  )
}

export default ForgotPassword
