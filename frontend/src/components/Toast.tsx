import { useEffect, useRef, useState } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'border-green-500 bg-green-900 text-green-50',
  error: 'border-red-500 bg-red-900 text-red-50',
  warning: 'border-amber-500 bg-amber-900 text-amber-50',
  info: 'border-slate-500 bg-slate-800 text-slate-50',
}

type ToastProps = {
  message: string
  type: ToastType
  onDismiss: () => void
}

function Toast({ message, type, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const onDismissRef = useRef(onDismiss)

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

  return (
    <div
      aria-atomic="true"
      aria-live={type === 'error' || type === 'warning' ? 'assertive' : 'polite'}
      className={`pointer-events-auto w-full rounded-xl border px-4 py-3 text-sm shadow-xl shadow-black/30 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
      } ${TOAST_STYLES[type]}`}
      role={type === 'error' || type === 'warning' ? 'alert' : 'status'}
    >
      {message}
    </div>
  )
}

export default Toast
