import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type ToastProps = {
  message: string
  type: 'success' | 'error'
  onDismiss: () => void
}

function Toast({ message, type, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const onDismissRef = useRef(onDismiss)
  const isSuccess = type === 'success'

  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => setIsVisible(true))
    const hideTimeout = window.setTimeout(() => setIsVisible(false), 3000)
    const removeTimeout = window.setTimeout(() => onDismissRef.current(), 3350)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.clearTimeout(hideTimeout)
      window.clearTimeout(removeTimeout)
    }
  }, [])

  return createPortal(
    <div
      aria-atomic="true"
      aria-live={isSuccess ? 'polite' : 'assertive'}
      className={`fixed right-4 top-4 z-[9999] w-[min(24rem,calc(100vw-2rem))] rounded-xl border px-4 py-3 text-sm shadow-2xl shadow-black/40 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
      } ${
        isSuccess
          ? 'border-emerald-400/30 bg-[#052e24] text-emerald-100'
          : 'border-red-400/30 bg-[#3b1117] text-red-100'
      }`}
      role={isSuccess ? 'status' : 'alert'}
    >
      {!isSuccess && (
        <span
          aria-hidden="true"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-400/15 text-red-300"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </span>
      )}
      <span>{message}</span>
    </div>,
    document.body,
  )
}

export default Toast
