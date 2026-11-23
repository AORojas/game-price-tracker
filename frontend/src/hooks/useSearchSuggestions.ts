import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SearchHistoryEntry } from '../services/userActivityService'

const STORAGE_KEY = 'game-price-tracker-search-history'
const MAX_SEARCHES = 10

export type SearchSuggestion = {
  term: string
  remoteId?: string
}

export function normalizeSearchTerm(term: string) {
  return term
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase()
}

function uniqueTerms(terms: string[]) {
  const seen = new Set<string>()
  const unique: string[] = []

  for (const term of terms) {
    const trimmed = term.trim()
    const normalized = normalizeSearchTerm(trimmed)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    unique.push(trimmed)
    if (unique.length === MAX_SEARCHES) break
  }

  return unique
}

function readLocalSearches() {
  if (typeof window === 'undefined') return []
  const value = window.localStorage.getItem(STORAGE_KEY)
  if (!value) return []

  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed) || !parsed.every((term) => typeof term === 'string')) {
      return []
    }
    return uniqueTerms(parsed)
  } catch {
    return []
  }
}

function writeLocalSearches(terms: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(terms))
}

export function filterSearchSuggestions(
  suggestions: SearchSuggestion[],
  query: string,
) {
  const normalizedQuery = normalizeSearchTerm(query)
  if (!normalizedQuery) return suggestions
  return suggestions.filter((suggestion) => {
    const normalizedTerm = normalizeSearchTerm(suggestion.term)
    return (
      normalizedTerm.startsWith(normalizedQuery) ||
      normalizedTerm.split(/\s+/).some((word) => word.startsWith(normalizedQuery))
    )
  })
}

export function useSearchSuggestions(remoteHistory: SearchHistoryEntry[]) {
  const [localTerms, setLocalTerms] = useState(readLocalSearches)
  const localTermsRef = useRef(localTerms)

  useEffect(() => {
    const mergedTerms = uniqueTerms([
      ...localTerms,
      ...remoteHistory.map((entry) => entry.search_term),
    ])
    if (
      mergedTerms.length === localTerms.length &&
      mergedTerms.every((term, index) => term === localTerms[index])
    ) {
      return
    }
    writeLocalSearches(mergedTerms)
  }, [localTerms, remoteHistory])

  useEffect(() => {
    localTermsRef.current = localTerms
  }, [localTerms])

  useEffect(() => {
    function syncFromOtherTab(event: StorageEvent) {
      if (event.key === STORAGE_KEY) {
        const nextTerms = readLocalSearches()
        localTermsRef.current = nextTerms
        setLocalTerms(nextTerms)
      }
    }

    window.addEventListener('storage', syncFromOtherTab)
    return () => window.removeEventListener('storage', syncFromOtherTab)
  }, [])

  const suggestions = useMemo(() => {
    const remoteByTerm = new Map(
      remoteHistory.map((entry) => [normalizeSearchTerm(entry.search_term), entry]),
    )
    const merged = uniqueTerms([
      ...localTerms,
      ...remoteHistory.map((entry) => entry.search_term),
    ])

    return merged.map((term) => ({
      term,
      remoteId: remoteByTerm.get(normalizeSearchTerm(term))?.id,
    }))
  }, [localTerms, remoteHistory])

  const recordSearch = useCallback((term: string) => {
    const trimmed = term.trim()
    if (!trimmed || trimmed.length > 200) return
    const currentTerms = localTermsRef.current
    if (
      currentTerms[0] &&
      normalizeSearchTerm(currentTerms[0]) === normalizeSearchTerm(trimmed)
    ) {
      return
    }
    const nextTerms = uniqueTerms([trimmed, ...currentTerms])
    localTermsRef.current = nextTerms
    writeLocalSearches(nextTerms)
    setLocalTerms(nextTerms)
  }, [])

  const removeLocalSearch = useCallback((term: string) => {
    const normalizedTerm = normalizeSearchTerm(term)
    const nextTerms = localTermsRef.current.filter(
      (item) => normalizeSearchTerm(item) !== normalizedTerm,
    )
    localTermsRef.current = nextTerms
    writeLocalSearches(nextTerms)
    setLocalTerms(nextTerms)
  }, [])

  return { suggestions, recordSearch, removeLocalSearch }
}
