import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import Toast from '../components/Toast'
import ToastContext, { type ToastMessage } from './ToastContext'

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const nextId = useRef(0)

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'success') => {
    nextId.current += 1
    setToasts((currentToasts) => [
      ...currentToasts,
      { id: nextId.current, message, type },
    ])
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id))
  }, [])
  const contextValue = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            onDismiss={() => dismissToast(toast.id)}
            type={toast.type}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
