import { Link } from 'react-router-dom'
import type { SearchHistoryEntry } from '../services/userActivityService'
import { formatActivityDate } from '../utils/formatActivityDate'

type ProfileSearchHistoryProps = {
  searchHistory: SearchHistoryEntry[]
  loading: boolean
}

function ProfileSearchHistory({
  searchHistory,
  loading,
}: ProfileSearchHistoryProps) {
  return (
    <section
      aria-labelledby="recent-searches-heading"
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl shadow-slate-950/25"
      id="recent-searches"
    >
      <h2 className="text-lg font-semibold" id="recent-searches-heading">
        Búsquedas recientes
      </h2>
      {loading ? (
        <p className="mt-3 text-sm text-[var(--color-text-muted)]" role="status">
          Cargando búsquedas...
        </p>
      ) : searchHistory.length > 0 ? (
        <ul className="mt-4 divide-y divide-[var(--color-border)]">
          {searchHistory.map((entry) => (
            <li className="py-3 first:pt-0 last:pb-0" key={entry.id}>
              <Link
                className="block rounded-md text-sm font-medium text-[var(--color-text)] transition hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                to={`/explorar?search=${encodeURIComponent(entry.search_term)}`}
              >
                {entry.search_term}
              </Link>
              <time
                className="mt-1 block text-xs text-[var(--color-text-muted)]"
                dateTime={entry.created_at}
              >
                {formatActivityDate(entry.created_at)}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-5">
          <p className="text-sm text-[var(--color-text-muted)]">
            Todavía no hay búsquedas recientes.
          </p>
          <Link
            className="mt-3 inline-flex text-sm font-semibold text-[var(--color-accent)] transition hover:text-blue-500"
            to="/explorar"
          >
            Explorar juegos
          </Link>
        </div>
      )}
    </section>
  )
}

export default ProfileSearchHistory
