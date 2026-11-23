import { createContext } from 'react'
import type { ToastType } from '../components/Toast'

export type ToastMessage = {
  id: number
  message: string
  type: ToastType
}

export type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export default ToastContext
