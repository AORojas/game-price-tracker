import { useCallback, useEffect, useRef, useState } from 'react'
import ConfirmModal from './ConfirmModal'
import Toast from './Toast'
import { useUsdArsRate } from '../hooks/useUsdArsRate'
import type {
  SavedOffer,
  UserAlert,
} from '../services/userActivityService'
import { formatArsPrice, formatUsdArsPrice } from '../utils/priceFormatting'

type ProfileSavedItemsProps = {
  alerts: UserAlert[]
  savedOffers: SavedOffer[]
  loading: boolean
  error: string
  onSetAlertActive: (alertId: string, isActive: boolean) => Promise<UserAlert>
  onUpdateAlertTargetPrice: (alertId: string, targetPriceArs: number) => Promise<UserAlert>
  onRemoveAlert: (alertId: string) => Promise<void>
  onRemoveSavedOffer: (savedOfferId: string) => Promise<void>
}

type ToastMessage = {
  id: number
  message: string
  type: 'success' | 'error'
}

const MAX_ALERT_TARGET_PRICE_ARS = 99_999_999.99

function formatUsd(value: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value))
}

function Artwork({
  title,
  image,
  className,
}: {
  title: string
  image: string | null
  className: string
}) {
  return image ? (
    <img
      alt={`Carátula de ${title}`}
      className={className}
      loading="lazy"
      src={image}
    />
  ) : (
    <div
      aria-label={`Carátula no disponible para ${title}`}
      className={`${className} grid place-items-center bg-[var(--color-surface-muted)] px-2 text-center text-xs text-[var(--color-text-muted)]`}
      role="img"
    >
      Sin carátula
    </div>
  )
}

function AlertActionIcon({ name }: { name: 'edit' | 'delete' | 'rearm' }) {
  const paths = {
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </>
    ),
    delete: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="m19 6-1 14H6L5 6" />
        <path d="M10 11v6M14 11v6" />
      </>
    ),
    rearm: (
      <>
        <path d="M20 11a8 8 0 0 0-14.9-4L4 9" />
        <path d="M4 4v5h5" />
        <path d="M4 13a8 8 0 0 0 14.9 4L20 15" />
        <path d="M20 20v-5h-5" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
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

function ProfileSavedItems({
  alerts,
  savedOffers,
  loading,
  error,
  onSetAlertActive,
  onUpdateAlertTargetPrice,
  onRemoveAlert,
  onRemoveSavedOffer,
}: ProfileSavedItemsProps) {
  const usdArs = useUsdArsRate()
  const [pendingAlertId, setPendingAlertId] = useState<string | null>(null)
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null)
  const [alertToDelete, setAlertToDelete] = useState<UserAlert | null>(null)
  const [targetPriceDraft, setTargetPriceDraft] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const nextToastId = useRef(0)
  const targetPriceInputRef = useRef<HTMLInputElement>(null)
  const hasSavedItems = alerts.length + savedOffers.length > 0

  const showToast = useCallback((message: string, type: ToastMessage['type']) => {
    nextToastId.current += 1
    setToast({ id: nextToastId.current, message, type })
  }, [])

  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    if (error) showToast(error, 'error')
  }, [error, showToast])

  useEffect(() => {
    if (editingAlertId) {
      targetPriceInputRef.current?.focus({ preventScroll: true })
    }
  }, [editingAlertId])

  function adjustTargetPriceDraft(direction: -1 | 1) {
    const currentPrice = Number(targetPriceDraft)
    const adjustedPrice = Math.min(
      MAX_ALERT_TARGET_PRICE_ARS,
      Math.max(0, currentPrice + direction),
    )
    setTargetPriceDraft(adjustedPrice.toFixed(2))
  }

  async function toggleAlert(alert: UserAlert) {
    setPendingAlertId(alert.id)
    try {
      await onSetAlertActive(alert.id, !alert.is_active)
    } catch {
      // The activity hook surfaces the request error in this section.
    } finally {
      setPendingAlertId(null)
    }
  }

  async function saveTargetPrice(alert: UserAlert) {
    if (!usdArs.quote) {
      showToast('No se puede actualizar la alerta sin la cotización oficial.', 'error')
      return
    }

    const targetPrice = Number(targetPriceDraft)
    if (
      !targetPriceDraft.trim() ||
      !Number.isFinite(targetPrice) ||
      targetPrice < 0 ||
      targetPrice > MAX_ALERT_TARGET_PRICE_ARS
    ) {
      showToast('Ingresa un precio válido mayor o igual a cero.', 'error')
      return
    }

    setPendingAlertId(alert.id)
    try {
      await onUpdateAlertTargetPrice(alert.id, targetPrice)
      setEditingAlertId(null)
      showToast('Precio actualizado', 'success')
    } catch {
      // The activity hook surfaces the request error in this section.
    } finally {
      setPendingAlertId(null)
    }
  }

  async function rearmAlert(alertId: string) {
    setPendingAlertId(alertId)
    try {
      await onSetAlertActive(alertId, true)
    } catch {
      // The activity hook surfaces the request error in this section.
    } finally {
      setPendingAlertId(null)
    }
  }

  async function confirmRemoveAlert() {
    if (!alertToDelete) return

    setPendingAlertId(alertToDelete.id)
    setDeleteError('')
    try {
      await onRemoveAlert(alertToDelete.id)
      if (editingAlertId === alertToDelete.id) setEditingAlertId(null)
      setAlertToDelete(null)
    } catch (requestError) {
      setDeleteError(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo eliminar la alerta.',
      )
    } finally {
      setPendingAlertId(null)
    }
  }

  function cancelRemoveAlert() {
    if (alertToDelete && pendingAlertId === alertToDelete.id) return
    setAlertToDelete(null)
    setDeleteError('')
  }

  return (
    <section
      aria-labelledby="saved-items-heading"
      className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl shadow-slate-950/25 backdrop-blur-sm sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold sm:text-xl" id="saved-items-heading">
            Alertas y ofertas guardadas
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Administra tus alertas y ofertas guardadas.
          </p>
          {usdArs.quote ? (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Dólar oficial vendedor: USD 1 = {formatArsPrice(usdArs.quote.rate)}
              {' '}(actualizado {new Date(usdArs.quote.updatedAt).toLocaleString('es-AR')})
            </p>
          ) : usdArs.error ? (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-warning)]" role="status">
              <span>La cotización ARS no está disponible; no se pueden editar alertas.</span>
              <button className="underline" onClick={usdArs.retry} type="button">
                Reintentar
              </button>
            </p>
          ) : usdArs.isLoading ? (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]" role="status">
              Cargando cotización oficial...
            </p>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--color-text-muted)]" role="status">
          Cargando alertas y ofertas...
        </p>
      ) : hasSavedItems ? (
        <div className="mt-5 space-y-6">
          {alerts.length > 0 && (
            <section aria-labelledby="price-alerts-heading">
              <h3
                className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]"
                id="price-alerts-heading"
              >
                Alertas de precios
              </h3>
              <ul className="mt-3 grid gap-2 lg:grid-cols-2">
                {alerts.map((alert) => {
                  const title = alert.game_title ?? 'Juego guardado'
                  const isPending = pendingAlertId === alert.id
                  const isEditing = editingAlertId === alert.id
                  const status = alert.is_notified
                    ? 'Notificada'
                    : alert.is_active
                      ? 'Activa'
                      : 'Pausada'
                  return (
                    <li
                      className="relative flex min-w-0 items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3"
                      key={alert.id}
                    >
                      <Artwork
                        className="h-16 w-12 shrink-0 rounded object-cover"
                        image={alert.game_image}
                        title={title}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--color-text)]" title={title}>
                          {title}
                        </p>
                        <div className="mt-1 flex h-10 min-w-0 items-center">
                          {isEditing ? (
                            <form
                              className="flex h-full min-w-0 items-center gap-1"
                              onSubmit={(event) => {
                                event.preventDefault()
                                void saveTargetPrice(alert)
                              }}
                            >
                              <label className="sr-only" htmlFor={`alert-target-${alert.id}`}>
                                Precio objetivo en ARS para {title}
                              </label>
                              <input
                                className="w-16 shrink-0 appearance-none [appearance:textfield] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-1 text-sm text-[var(--color-text)] focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                id={`alert-target-${alert.id}`}
                                max={MAX_ALERT_TARGET_PRICE_ARS}
                                min="0"
                                onChange={(event) => {
                                  setTargetPriceDraft(event.target.value)
                                }}
                                ref={targetPriceInputRef}
                                step="0.01"
                                type="number"
                                value={targetPriceDraft}
                                disabled={!usdArs.quote || isPending}
                              />
                              <button
                                aria-label={`Disminuir precio objetivo de ${title}`}
                                className="grid h-6 w-6 shrink-0 place-items-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-60"
                                disabled={isPending || !usdArs.quote}
                                onClick={() => adjustTargetPriceDraft(-1)}
                                type="button"
                              >
                                <svg
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M5 12h14" />
                                </svg>
                              </button>
                              <button
                                aria-label={`Aumentar precio objetivo de ${title}`}
                                className="grid h-6 w-6 shrink-0 place-items-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-60"
                                disabled={isPending || !usdArs.quote}
                                onClick={() => adjustTargetPriceDraft(1)}
                                type="button"
                              >
                                <svg
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M5 12h14M12 5v14" />
                                </svg>
                              </button>
                              <button
                                className="shrink-0 whitespace-nowrap rounded-md bg-blue-600 px-1.5 py-1 text-[10px] font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-60"
                                disabled={isPending || !usdArs.quote}
                                type="submit"
                              >
                                Guardar
                              </button>
                              <button
                                className="shrink-0 whitespace-nowrap rounded-md px-1 py-1 text-[10px] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                                onClick={() => setEditingAlertId(null)}
                                type="button"
                              >
                                Cancelar
                              </button>
                            </form>
                          ) : (
                            <div className="flex h-full items-center gap-1">
                            <p className="text-xs text-[var(--color-text-muted)]">
                              Objetivo: {formatUsdArsPrice(
                                Number(alert.target_price),
                                usdArs.quote?.rate ?? null,
                              )}
                            </p>
                            <button
                              aria-label={`Editar precio objetivo de ${title}`}
                              className="rounded p-1 text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-60"
                              disabled={isPending || !usdArs.quote}
                              onClick={() => {
                                if (!usdArs.quote) return
                                setTargetPriceDraft(
                                  (Number(alert.target_price) * usdArs.quote.rate).toFixed(2),
                                )
                                setEditingAlertId(alert.id)
                              }}
                              type="button"
                            >
                              <AlertActionIcon name="edit" />
                            </button>
                            </div>
                          )}
                        </div>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            alert.is_notified
                              ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
                              : alert.is_active
                                ? 'bg-[var(--color-status-success-bg)] text-[var(--color-status-success)]'
                                : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]'
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <div className="flex items-center gap-1">
                          {alert.is_notified && (
                            <button
                              aria-label={`Rearmar alerta de ${title}`}
                              className="rounded p-1 text-[var(--color-accent)] transition hover:text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-60"
                              disabled={isPending}
                              onClick={() => void rearmAlert(alert.id)}
                              title="Rearmar alerta"
                              type="button"
                            >
                              <AlertActionIcon name="rearm" />
                            </button>
                          )}
                          <button
                            aria-label={`Eliminar alerta de ${title}`}
                            className="rounded p-1 text-[var(--color-text-muted)] transition hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-60"
                            disabled={isPending}
                            onClick={() => {
                              setDeleteError('')
                              setAlertToDelete(alert)
                            }}
                            title="Eliminar alerta"
                            type="button"
                          >
                            <AlertActionIcon name="delete" />
                          </button>
                        </div>
                        <button
                          aria-checked={alert.is_active}
                          aria-label={`${alert.is_active ? 'Pausar' : 'Activar'} alerta de ${title}`}
                          className={`relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-wait disabled:opacity-60 ${
                            alert.is_active ? 'bg-blue-500' : 'bg-slate-600'
                          }`}
                          disabled={isPending}
                          onClick={() => void toggleAlert(alert)}
                          role="switch"
                          type="button"
                        >
                          <span
                            className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                              alert.is_active ? 'left-6' : 'left-1'
                            }`}
                          />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {savedOffers.length > 0 && (
            <section aria-labelledby="saved-offers-heading">
              <h3
                className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]"
                id="saved-offers-heading"
              >
                Ofertas guardadas
              </h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {savedOffers.map((offer) => {
                  const title = offer.game_title ?? 'Juego guardado'
                  return (
                    <li
                      className="flex min-w-0 items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3"
                      key={offer.id}
                    >
                      <Artwork
                        className="h-16 w-12 shrink-0 rounded object-cover"
                        image={offer.game_image}
                        title={title}
                      />
                      <div className="min-w-0 flex-1">
                        <a
                          className="block truncate text-sm font-medium text-[var(--color-accent)] hover:text-blue-500 hover:underline"
                          href={offer.url}
                          rel="noreferrer"
                          target="_blank"
                          title={title}
                        >
                          {title}
                        </a>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                          {formatUsd(offer.price_at_save)}
                        </p>
                      </div>
                      <button
                        aria-label={`Quitar oferta guardada de ${title}`}
                        className="shrink-0 text-xs font-medium text-red-600 transition hover:text-red-500"
                        onClick={() => void onRemoveSavedOffer(offer.id).catch(() => undefined)}
                        type="button"
                      >
                        Quitar
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-5 text-sm text-[var(--color-text-muted)]">
          Aún no guardaste alertas ni ofertas.
        </p>
      )}
      <ConfirmModal
        cancelLabel="Cancelar"
        confirmLabel="Aceptar"
        errorMessage={deleteError}
        isConfirming={alertToDelete !== null && pendingAlertId === alertToDelete.id}
        isOpen={alertToDelete !== null}
        message="¿Seguro que quieres eliminar esta alerta?"
        onCancel={cancelRemoveAlert}
        onConfirm={confirmRemoveAlert}
        title="Eliminar alerta"
      />
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          onDismiss={dismissToast}
          type={toast.type}
        />
      )}
    </section>
  )
}

export default ProfileSavedItems
