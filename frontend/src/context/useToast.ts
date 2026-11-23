import { useContext } from 'react'
import ToastContext from './ToastContext'

function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast debe utilizarse dentro de ToastProvider.')
  }
  return context
}

export { useToast }
