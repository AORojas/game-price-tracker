const AGE_RATING_LABELS: Record<string, string> = {
  AO: 'AO (Solo adultos)',
  'ADULTS ONLY': 'AO (Solo adultos)',
  'ADULTS ONLY 18+': 'AO (Solo adultos)',
  EC: 'EC (Primera infancia)',
  E: 'E (Todos)',
  EVERYONE: 'E (Todos)',
  E10: 'E10+ (Mayores de 10 años)',
  'E10+': 'E10+ (Mayores de 10 años)',
  'EVERYONE 10+': 'E10+ (Mayores de 10 años)',
  M: 'M (Maduro)',
  MATURE: 'M (Maduro)',
  RP: 'RP (Clasificación pendiente)',
  'RATING PENDING': 'RP (Clasificación pendiente)',
  T: 'T (Adolescentes)',
  TEEN: 'T (Adolescentes)',
}

const IGDB_ESRB_RATINGS: Record<number, string> = {
  6: 'RP',
  7: 'EC',
  8: 'E',
  9: 'E10+',
  10: 'T',
  11: 'M',
  12: 'AO',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatRatingName(value: string) {
  const trimmedValue = value.trim()
  const normalizedValue = trimmedValue.toUpperCase()
  if (AGE_RATING_LABELS[normalizedValue]) return AGE_RATING_LABELS[normalizedValue]
  if (/^\d+$/.test(trimmedValue)) {
    const age = Number(trimmedValue)
    return age > 0 ? `${age}+` : null
  }
  if (/^(PEGI|USK|CERO)\s*\d+$/i.test(trimmedValue)) return trimmedValue.toUpperCase()
  if (/^\d+\+$/.test(trimmedValue)) return trimmedValue
  return trimmedValue
}

function formatRatingCode(value: unknown) {
  if (typeof value === 'string' && value.trim()) return formatRatingName(value)
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    const esrbRating = IGDB_ESRB_RATINGS[value]
    return esrbRating ? AGE_RATING_LABELS[esrbRating] : null
  }
  return null
}

export function formatAgeRating(rawData: unknown): string | null {
  if (typeof rawData === 'string') return formatRatingCode(rawData)
  if (typeof rawData === 'number') {
    if (!Number.isSafeInteger(rawData) || rawData <= 0) return null
    return `${rawData}+`
  }
  if (Array.isArray(rawData)) {
    const esrbRating = rawData.find(
      (entry) => isRecord(entry) && entry.category === 1,
    )
    return isRecord(esrbRating) ? formatRatingCode(esrbRating.rating) : null
  }
  if (!isRecord(rawData)) return null

  const esrbRating = rawData.esrbRating
  if (typeof esrbRating === 'string' || typeof esrbRating === 'number') {
    return typeof esrbRating === 'number'
      ? formatAgeRating(esrbRating)
      : formatRatingCode(esrbRating)
  }

  const rawgRating = rawData.esrb_rating
  if (isRecord(rawgRating) && typeof rawgRating.name === 'string') {
    return formatRatingCode(rawgRating.name)
  }

  const ratings = rawData.ratings
  if (isRecord(ratings)) {
    for (const [provider, prefix] of [
      ['esrb', ''],
      ['pegi', 'PEGI '],
      ['usk', 'USK '],
    ]) {
      const ratingValue = ratings[provider]
      const rating = isRecord(ratingValue) ? ratingValue.rating : ratingValue
      if (typeof rating === 'string' && rating.trim()) {
        return formatRatingCode(`${prefix}${rating}`)
      }
      if (typeof rating === 'number' && Number.isSafeInteger(rating) && rating >= 0) {
        return prefix
          ? formatRatingCode(`${prefix}${rating}`)
          : formatAgeRating(rating)
      }
    }
  }

  const igdbRatings = rawData.age_ratings
  if (Array.isArray(igdbRatings)) {
    const mappedRating = formatAgeRating(igdbRatings)
    if (mappedRating) return mappedRating
  }

  const requiredAge = rawData.required_age
  if (typeof requiredAge === 'number' || typeof requiredAge === 'string') {
    return formatAgeRating(requiredAge)
  }
  return null
}
