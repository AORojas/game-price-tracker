import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/useAuth'
import {
  addSearch as addSearchRequest,
  createAlert as createAlertRequest,
  deleteAlert as deleteAlertRequest,
  deleteFavorite as deleteFavoriteRequest,
  deleteSavedOffer as deleteSavedOfferRequest,
  getUserActivity,
  saveOffer as saveOfferRequest,
  toggleFavorite as toggleFavoriteRequest,
  updateAlert as updateAlertRequest,
  type Favorite,
  type SavedOffer,
  type SearchHistoryEntry,
  type UserAlert,
} from '../services/userActivityService'

export type NewSavedOffer = Omit<SavedOffer, 'id' | 'created_at'>

export function useUserActivity() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [alerts, setAlerts] = useState<UserAlert[]>([])
  const [savedOffers, setSavedOffers] = useState<SavedOffer[]>([])
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!user) {
      setFavorites([])
      setAlerts([])
      setSavedOffers([])
      setSearchHistory([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const requestSignal = signal ?? new AbortController().signal
      const activity = await getUserActivity(requestSignal)
      setFavorites(activity.favorites)
      setAlerts(activity.alerts)
      setSavedOffers(activity.savedOffers)
      setSearchHistory(activity.searchHistory)
    } catch (requestError) {
      if (!signal?.aborted) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo cargar la actividad de tu cuenta.'
        setError(message)
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (isAuthLoading) return
    const controller = new AbortController()
    void refresh(controller.signal)
    return () => controller.abort()
  }, [isAuthLoading, refresh])

  const runMutation = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T> => {
      if (!user) throw new Error('Inicia sesión para guardar tu actividad.')
      setError('')
      try {
        return await operation()
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo guardar la actividad.'
        setError(message)
        throw requestError
      }
    },
    [user],
  )

  const toggleFavorite = useCallback(
    (gameId: string, gameTitle: string, gameImage: string | null) =>
      runMutation(async () => {
        const result = await toggleFavoriteRequest(gameId, gameTitle, gameImage)
        setFavorites((current) =>
          result.isFavorite && result.favorite
            ? [result.favorite, ...current.filter((item) => item.game_id !== gameId)]
            : current.filter((item) => item.game_id !== gameId),
        )
        return result.isFavorite
      }),
    [runMutation],
  )

  const removeFavorite = useCallback(
    (favoriteId: string) =>
      runMutation(async () => {
        await deleteFavoriteRequest(favoriteId)
        setFavorites((current) => current.filter((item) => item.id !== favoriteId))
      }),
    [runMutation],
  )

  const createAlert = useCallback(
    (
      gameId: string,
      gameTitle: string,
      gameImage: string | null,
      targetPrice: number,
    ) =>
      runMutation(async () => {
        const alert = await createAlertRequest(
          gameId,
          gameTitle,
          gameImage,
          targetPrice,
        )
        setAlerts((current) => [alert, ...current])
        return alert
      }),
    [runMutation],
  )

  const setAlertActive = useCallback(
    (alertId: string, isActive: boolean) =>
      runMutation(async () => {
        const alert = await updateAlertRequest(alertId, isActive)
        setAlerts((current) =>
          current.map((item) => (item.id === alertId ? alert : item)),
        )
        return alert
      }),
    [runMutation],
  )

  const removeAlert = useCallback(
    (alertId: string) =>
      runMutation(async () => {
        await deleteAlertRequest(alertId)
        setAlerts((current) => current.filter((item) => item.id !== alertId))
      }),
    [runMutation],
  )

  const saveOffer = useCallback(
    (offer: NewSavedOffer) =>
      runMutation(async () => {
        const savedOffer = await saveOfferRequest(offer)
        setSavedOffers((current) => [savedOffer, ...current])
        return savedOffer
      }),
    [runMutation],
  )

  const removeSavedOffer = useCallback(
    (savedOfferId: string) =>
      runMutation(async () => {
        await deleteSavedOfferRequest(savedOfferId)
        setSavedOffers((current) =>
          current.filter((item) => item.id !== savedOfferId),
        )
      }),
    [runMutation],
  )

  const addSearch = useCallback(
    (term: string) =>
      runMutation(async () => {
        const entry = await addSearchRequest(term)
        setSearchHistory((current) =>
          [entry, ...current.filter(
            (item) => item.search_term.toLocaleLowerCase() !== term.trim().toLocaleLowerCase(),
          )].slice(0, 10),
        )
        return entry
      }),
    [runMutation],
  )

  return {
    favorites,
    alerts,
    savedOffers,
    searchHistory,
    loading: isAuthLoading || loading,
    error,
    refresh,
    toggleFavorite,
    removeFavorite,
    createAlert,
    setAlertActive,
    removeAlert,
    saveOffer,
    removeSavedOffer,
    addSearch,
  }
}
