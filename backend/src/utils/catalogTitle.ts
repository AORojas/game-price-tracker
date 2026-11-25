export function normalizeCatalogTitle(title: string) {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(edition|deluxe)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
