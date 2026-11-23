import { useEffect, useRef } from 'react'
import type { MouseEvent, SyntheticEvent } from 'react'

type ConfirmModalProps = {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  isConfirming?: boolean
  errorMessage?: string
  confirmLabel?: string
  cancelLabel?: string
}

function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isConfirming = false,
  errorMessage = '',
  confirmLabel = 'Aceptar',
  cancelLabel = 'Cancelar',
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    if (!isConfirming) onCancel()
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget && !isConfirming) onCancel()
  }

  return (
    <dialog
      aria-describedby="confirm-modal-message"
      aria-labelledby="confirm-modal-title"
      aria-modal="true"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-0 text-[var(--color-text)] shadow-2xl shadow-black/30 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      ref={dialogRef}
      role="alertdialog"
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold" id="confirm-modal-title">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]" id="confirm-modal-message">
          {message}
        </p>
        {errorMessage && (
          <p className="mt-4 text-sm text-[var(--color-status-error)]" role="alert">
            {errorMessage}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            autoFocus
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-wait disabled:opacity-60"
            disabled={isConfirming}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-wait disabled:opacity-60"
            disabled={isConfirming}
            onClick={() => void onConfirm()}
            type="button"
          >
            {isConfirming ? 'Eliminando...' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default ConfirmModal
