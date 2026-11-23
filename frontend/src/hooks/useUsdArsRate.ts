import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '../context/useToast'
import {
  getUsdArsQuote,
  type UsdArsQuote,
} from '../services/exchangeRateService'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000

export function useUsdArsRate() {
  const { showToast } = useToast()
  const [quote, setQuote] = useState<UsdArsQuote | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const hasShownError = useRef(false)

  const retry = useCallback(() => {
    setIsLoading(true)
    setRefreshKey((current) => current + 1)
  }, [])

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    async function refreshQuote() {
      try {
        const nextQuote = await getUsdArsQuote(controller.signal)
        if (!active) return
        setQuote(nextQuote)
        setError('')
        hasShownError.current = false
      } catch (requestError) {
        if (!active || controller.signal.aborted) return
        setQuote(null)
        const message =
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo obtener la cotización oficial del dólar.'
        setError(message)
        if (!hasShownError.current) {
          hasShownError.current = true
          showToast(`Cotización oficial no disponible: ${message}`, 'warning')
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void refreshQuote()
    const timer = window.setInterval(() => {
      void refreshQuote()
    }, REFRESH_INTERVAL_MS)

    return () => {
      active = false
      controller.abort()
      window.clearInterval(timer)
    }
  }, [refreshKey, showToast])

  return { quote, error, isLoading, retry }
}
