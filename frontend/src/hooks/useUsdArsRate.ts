import { useCallback, useEffect, useState } from 'react'
import {
  getUsdArsQuote,
  type UsdArsQuote,
} from '../services/exchangeRateService'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000

export function useUsdArsRate() {
  const [quote, setQuote] = useState<UsdArsQuote | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

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
      } catch (requestError) {
        if (!active || controller.signal.aborted) return
        setQuote(null)
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo obtener la cotización oficial del dólar.',
        )
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
  }, [refreshKey])

  return { quote, error, isLoading, retry }
}
