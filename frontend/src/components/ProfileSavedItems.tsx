import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../context/useToast'
import ConfirmModal from './ConfirmModal'
import { useUsdArsRate } from '../hooks/useUsdArsRate'
import type {
  SavedOffer,
  UserAlert,
} from '../services/userActivityService'
import { formatActivityDate } from '../utils/formatActivityDate'
import {
  formatArsPrice,
  formatUsdArsPrice,
  formatUsdPrice,
} from '../utils/priceFormatting'

type ProfileSavedItemsProps = {
  alerts: UserAlert[]
  savedOffers: SavedOffer[]
  loading: boolean
  onSetAlertActive: (alertId: string, isActive: boolean) => Promise<UserAlert>
  onUpdateAlertTargetPrice: (alertId: string, targetPriceArs: number) => Promise<UserAlert>
  onRemoveAlert: (alertId: string) => Promise<void>
  onRemoveSavedOffer: (savedOfferId: string) => Promise<void>
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
  const [isQuoteTooltipOpen, setIsQuoteTooltipOpen] = useState(false)
  const targetPriceInputRef = useRef<HTMLInputElement>(null)
  const editPopoverRef = useRef<HTMLFormElement>(null)
  const quoteTooltipRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  useEffect(() => {
    if (editingAlertId) {
      targetPriceInputRef.current?.focus({ preventScroll: true })
    }
  }, [editingAlertId])

  useEffect(() => {
    if (!editingAlertId) return

    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Element)) return
      if (editPopoverRef.current?.contains(event.target)) return
      if (event.target.closest('[data-alert-edit-trigger]')) return
      setEditingAlertId(null)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setEditingAlertId(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [editingAlertId])

  useEffect(() => {
    if (!isQuoteTooltipOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !quoteTooltipRef.current?.contains(event.target)
      ) {
        setIsQuoteTooltipOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsQuoteTooltipOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isQuoteTooltipOpen])

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
      // The activity hook reports request failures through the global toast.
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
      showToast('Precio objetivo actualizado.', 'success')
    } catch {
      // The activity hook reports request failures through the global toast.
    } finally {
      setPendingAlertId(null)
    }
  }

  async function rearmAlert(alertId: string) {
    setPendingAlertId(alertId)
    try {
      await onSetAlertActive(alertId, true)
    } catch {
      // The activity hook reports request failures through the global toast.
    } finally {
      setPendingAlertId(null)
    }
  }

  async function confirmRemoveAlert() {
    if (!alertToDelete) return

    setPendingAlertId(alertToDelete.id)
    try {
      await onRemoveAlert(alertToDelete.id)
      if (editingAlertId === alertToDelete.id) setEditingAlertId(null)
      setAlertToDelete(null)
      showToast('Alerta eliminada.', 'success')
    } catch {
      return
    } finally {
      setPendingAlertId(null)
    }
  }

  function cancelRemoveAlert() {
    if (alertToDelete && pendingAlertId === alertToDelete.id) return
    setAlertToDelete(null)
  }

  return (
    <>
      <section
        aria-labelledby="price-alerts-heading"
        className="mt-5 min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl shadow-slate-950/25 backdrop-blur-sm sm:p-6"
        id="price-alerts"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold sm:text-xl" id="price-alerts-heading">
              Alertas de precios
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Administra el precio objetivo y el estado de tus alertas.
            </p>
          </div>
          {usdArs.quote && (
            <div className="group relative shrink-0" ref={quoteTooltipRef}>
              <button
                aria-controls="usd-rate-tooltip"
                aria-expanded={isQuoteTooltipOpen}
                aria-label="Información sobre la cotización del dólar"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                onClick={() => setIsQuoteTooltipOpen((open) => !open)}
                type="button"
              >
                <span>USD 1 = {formatArsPrice(usdArs.quote.rate)}</span>
                <span aria-hidden="true">ⓘ</span>
              </button>
              <div
                className={`invisible absolute right-0 top-full z-50 mt-2 w-max max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs text-[var(--color-text)] shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 ${
                  isQuoteTooltipOpen ? 'visible opacity-100' : 'opacity-0'
                }`}
                id="usd-rate-tooltip"
                role="tooltip"
              >
                Dólar oficial vendedor · USD 1 = {formatArsPrice(usdArs.quote.rate)}
                {' · Actualizado '}
                {new Date(usdArs.quote.updatedAt).toLocaleString('es-AR')}
              </div>
            </div>
          )}
        </div>
        {!usdArs.quote && usdArs.error ? (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-warning)]" role="status">
            <button className="underline" onClick={usdArs.retry} type="button">
              Reintentar
            </button>
          </div>
        ) : !usdArs.quote && usdArs.isLoading ? (
          <p className="mt-1 text-xs text-[var(--color-text-muted)]" role="status">
            Cargando cotización oficial...
          </p>
        ) : null}

        {loading ? (
          <p className="mt-4 text-sm text-[var(--color-text-muted)]" role="status">
            Cargando alertas...
          </p>
        ) : alerts.length > 0 ? (
          <ul className="mt-4 grid min-w-0 gap-2 lg:grid-cols-2">
            {alerts.map((alert) => {
              const title = alert.game_title ?? 'Juego guardado'
              const gameId = alert.cheapshark_id ?? alert.game_id
              const isPending = pendingAlertId === alert.id
              const isEditing = editingAlertId === alert.id
              const draftArsAmount = Number(targetPriceDraft)
              const draftUsdEquivalent =
                targetPriceDraft.trim() &&
                Number.isFinite(draftArsAmount) &&
                usdArs.quote?.rate
                  ? formatUsd((draftArsAmount / usdArs.quote.rate).toFixed(2))
                  : '—'
              const status = alert.is_notified
                ? 'Notificada'
                : alert.is_active
                  ? 'Activa'
                  : 'Pausada'

              return (
                <li
                  className={`relative flex min-w-0 items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 ${
                    isEditing ? 'z-30' : ''
                  }`}
                  key={alert.id}
                >
                  <Artwork
                    className="h-16 w-12 shrink-0 rounded object-cover"
                    image={alert.game_image}
                    title={title}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <Link
                        className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-accent)] hover:text-blue-500 hover:underline"
                        to={`/explorar/id/${encodeURIComponent(gameId)}`}
                        title={title}
                      >
                        {title}
                      </Link>
                      <div className="flex shrink-0 items-center gap-1">
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
                            setAlertToDelete(alert)
                          }}
                          title="Eliminar alerta"
                          type="button"
                        >
                          <AlertActionIcon name="delete" />
                        </button>
                      </div>
                    </div>
                    <time
                      className="mt-1 block text-[11px] text-[var(--color-text-muted)]"
                      dateTime={alert.created_at}
                    >
                      Creada {formatActivityDate(alert.created_at)}
                    </time>

                    <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                      <div className="flex min-w-0 items-center gap-1">
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Objetivo: {formatUsdArsPrice(
                            Number(alert.target_price),
                            usdArs.quote?.rate ?? null,
                          )}
                        </p>
                        <button
                          aria-expanded={isEditing}
                          aria-label={`Editar precio objetivo de ${title}`}
                          className="rounded p-1 text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-60"
                          data-alert-edit-trigger
                          disabled={isPending || !usdArs.quote}
                          onClick={() => {
                            if (isEditing) {
                              setEditingAlertId(null)
                              return
                            }
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

                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          alert.is_notified
                            ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
                            : alert.is_active
                              ? 'bg-[var(--color-status-success-bg)] text-[var(--color-status-success)]'
                              : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]'
                        }`}
                      >
                        {status}
                      </span>
                      <button
                        aria-checked={alert.is_active}
                        aria-label={`${alert.is_active ? 'Pausar' : 'Activar'} alerta de ${title}`}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-wait disabled:opacity-60 ${
                          alert.is_active ? 'bg-blue-500' : 'bg-[var(--color-text-muted)]'
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
                  </div>
                  {isEditing && (
                    <form
                      className="absolute inset-x-0 bottom-0 z-30 flex min-w-0 flex-col gap-2 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[var(--color-text)] shadow-lg"
                      onSubmit={(event) => {
                        event.preventDefault()
                        void saveTargetPrice(alert)
                      }}
                      ref={editPopoverRef}
                    >
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <label
                          className="text-xs font-semibold text-[var(--color-text)]"
                          htmlFor={`alert-target-${alert.id}`}
                        >
                          Nuevo objetivo (ARS)
                        </label>
                        <span className="text-xs font-medium text-[var(--color-text-muted)]">
                          ≈ {targetPriceDraft.trim() && Number.isFinite(draftArsAmount) && usdArs.quote?.rate
                            ? formatUsdPrice(draftArsAmount / usdArs.quote.rate)
                            : '—'}
                        </span>
                      </div>
                      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                        <input
                          className="box-border w-full min-w-0 max-w-[180px] appearance-none [appearance:textfield] rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-1.5 text-sm text-[var(--color-text)] focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          id={`alert-target-${alert.id}`}
                          max={MAX_ALERT_TARGET_PRICE_ARS}
                          min="0"
                          onChange={(event) => setTargetPriceDraft(event.target.value)}
                          ref={targetPriceInputRef}
                          step="0.01"
                          type="number"
                          value={targetPriceDraft}
                          disabled={!usdArs.quote || isPending}
                        />
                        <button
                          aria-label={`Disminuir precio objetivo de ${title}`}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-60"
                          disabled={isPending || !usdArs.quote}
                          onClick={() => adjustTargetPriceDraft(-1)}
                          type="button"
                        >
                          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M5 12h14" />
                          </svg>
                        </button>
                        <button
                          aria-label={`Aumentar precio objetivo de ${title}`}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-60"
                          disabled={isPending || !usdArs.quote}
                          onClick={() => adjustTargetPriceDraft(1)}
                          type="button"
                        >
                          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M5 12h14M12 5v14" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Equivalente: {draftUsdEquivalent}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-60"
                          disabled={isPending || !usdArs.quote}
                          type="submit"
                        >
                          Guardar
                        </button>
                        <button
                          className="rounded-md border border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                          onClick={() => setEditingAlertId(null)}
                          type="button"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-5 text-sm text-[var(--color-text-muted)]">
            Aún no tienes alertas de precios.
          </p>
        )}
      </section>

      <section
        aria-labelledby="saved-offers-heading"
        className="mt-5 min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl shadow-slate-950/25 backdrop-blur-sm sm:p-6"
        id="saved-offers"
      >
        <h2 className="text-lg font-semibold sm:text-xl" id="saved-offers-heading">
          Ofertas guardadas
        </h2>
        {loading ? (
          <p className="mt-4 text-sm text-[var(--color-text-muted)]" role="status">
            Cargando ofertas...
          </p>
        ) : savedOffers.length > 0 ? (
          <ul className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2">
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
                    onClick={() => {
                      void onRemoveSavedOffer(offer.id)
                        .then(() => showToast('Oferta eliminada de tu perfil.', 'success'))
                        .catch(() => undefined)
                    }}
                    type="button"
                  >
                    Quitar
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-5 text-sm text-[var(--color-text-muted)]">
            Aún no guardaste ofertas.
          </p>
        )}
      </section>

      <ConfirmModal
        cancelLabel="Cancelar"
        confirmLabel="Aceptar"
        isConfirming={alertToDelete !== null && pendingAlertId === alertToDelete.id}
        isOpen={alertToDelete !== null}
        message="¿Seguro que quieres eliminar esta alerta?"
        onCancel={cancelRemoveAlert}
        onConfirm={confirmRemoveAlert}
        title="Eliminar alerta"
      />
    </>
  )
}

export default ProfileSavedItems
