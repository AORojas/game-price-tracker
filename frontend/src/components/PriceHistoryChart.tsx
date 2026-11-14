import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { GamePriceHistoryPoint } from '../services/gameSearchService'

type HistoryRange = '3m' | '6m' | '1y' | 'all'

type PriceHistoryChartProps = {
  points: GamePriceHistoryPoint[]
  currentPrice: number | null
  currency: string
  loading: boolean
  error: string
}

const rangeOptions: { value: HistoryRange; label: string; months: number | null }[] = [
  { value: '3m', label: '3M', months: 3 },
  { value: '6m', label: '6M', months: 6 },
  { value: '1y', label: '1A', months: 12 },
  { value: 'all', label: 'Todo', months: null },
]

const chartHeight = 250
const chartLeft = 78
const chartRight = 16
const chartTop = 20
const chartBottom = 46

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)
}

function formatDate(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('es-AR', options).format(new Date(`${date}T00:00:00`))
}

function formatLocalDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function createMockHistory(
  currentPrice: number | null,
  points: GamePriceHistoryPoint[],
): GamePriceHistoryPoint[] {
  // TODO: QUITAR DATOS MOCK CUANDO LA DB TENGA HISTORIAL SUFICIENTE
  const count = 18
  const end = new Date()
  const start = new Date(end)
  start.setMonth(start.getMonth() - 6)
  const basePrice = currentPrice ?? points.at(-1)?.price ?? 30
  const duration = end.getTime() - start.getTime()

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getTime() + (duration * index) / (count - 1))
    const variation = 1 + Math.sin(index * 1.27) * 0.13 + Math.cos(index * 0.53) * 0.06
    const price =
      index === count - 1
        ? basePrice
        : Math.max(0.99, Number((basePrice * variation).toFixed(2)))

    return { date: formatLocalDate(date), price }
  })
}

function PriceHistoryChart({
  points,
  currentPrice,
  currency,
  loading,
  error,
}: PriceHistoryChartProps) {
  const gradientId = useId().replaceAll(':', '')
  const [range, setRange] = useState<HistoryRange>('3m')
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null)
  const [chartWidth, setChartWidth] = useState(640)
  const chartContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = chartContainerRef.current
    if (!container) return

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width)
      if (width > 0) setChartWidth(width)
    })
    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  const plotWidth = chartWidth - chartLeft - chartRight
  const plotHeight = chartHeight - chartTop - chartBottom
  const selectedRange = rangeOptions.find((option) => option.value === range)
  const chartPoints = useMemo(
    () => (points.length < 5 ? createMockHistory(currentPrice, points) : points),
    [currentPrice, points],
  )
  const filteredPoints = useMemo(() => {
    if (!selectedRange?.months) return chartPoints

    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - selectedRange.months)
    const cutoffDate = [
      cutoff.getFullYear(),
      String(cutoff.getMonth() + 1).padStart(2, '0'),
      String(cutoff.getDate()).padStart(2, '0'),
    ].join('-')

    return chartPoints.filter((point) => point.date >= cutoffDate)
  }, [chartPoints, selectedRange])

  const maxPrice = Math.max(1, ...filteredPoints.map((point) => point.price))
  const axisMax = Math.max(20, Math.ceil(maxPrice / 20) * 20)
  const firstTime = filteredPoints[0]
    ? new Date(`${filteredPoints[0].date}T00:00:00`).getTime()
    : 0
  const lastTime = filteredPoints.at(-1)
    ? new Date(`${filteredPoints.at(-1)?.date}T00:00:00`).getTime()
    : 0
  const pointsOnChart = filteredPoints.map((point, index) => {
    const time = new Date(`${point.date}T00:00:00`).getTime()
    const x =
      firstTime === lastTime
        ? chartLeft + plotWidth / 2
        : chartLeft + ((time - firstTime) / (lastTime - firstTime)) * plotWidth
    const y = chartTop + plotHeight - (point.price / axisMax) * plotHeight
    return { ...point, x, y, index }
  })
  const linePath = pointsOnChart
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
  const areaPath =
    pointsOnChart.length > 1
      ? `${linePath} L ${pointsOnChart.at(-1)?.x} ${chartTop + plotHeight} L ${pointsOnChart[0].x} ${chartTop + plotHeight} Z`
      : ''
  const activePoint =
    activePointIndex === null ? null : pointsOnChart[activePointIndex] ?? null
  const lowestPrice =
    chartPoints.length > 0
      ? Math.min(...chartPoints.map((point) => point.price))
      : null
  const lowestPoint =
    lowestPrice === null
      ? null
      : chartPoints.find((point) => point.price === lowestPrice) ?? null
  const axisValues = [0, axisMax / 4, axisMax / 2, (axisMax * 3) / 4, axisMax]
  const dateTickIndexes = [
    ...new Set([
      0,
      Math.round((pointsOnChart.length - 1) / 3),
      Math.round(((pointsOnChart.length - 1) * 2) / 3),
      pointsOnChart.length - 1,
    ]),
  ].filter((index) => index >= 0)

  return (
    <section
      aria-labelledby="price-history-heading"
      className="theme-dynamic w-full min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold" id="price-history-heading">
          <span aria-hidden="true" className="mr-2 text-[var(--theme-primary)]">⌁</span>
          Historial de precios
        </h2>
        {!loading && !error && points.length < 5 && (
          <span
            className="rounded-full bg-amber-400/10 px-2 py-1 text-[10px] font-medium text-amber-300"
            title="Los puntos del gráfico son simulados y no representan precios históricos reales."
          >
            Vista previa
          </span>
        )}
        <div aria-label="Filtrar historial por período" className="flex gap-1" role="group">
          {rangeOptions.map((option) => (
            <button
              aria-pressed={range === option.value}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                range === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
              key={option.value}
              onClick={() => {
                setRange(option.value)
                setActivePointIndex(null)
              }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 w-full min-w-0" ref={chartContainerRef}>
        {loading ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-[var(--color-text-muted)]" role="status">
            Cargando historial de precios...
          </div>
        ) : error ? (
          <p className="flex h-[250px] items-center justify-center text-center text-sm text-[var(--color-text-muted)]" role="alert">
            {error}
          </p>
        ) : filteredPoints.length === 0 ? (
          <p className="flex h-[250px] items-center justify-center text-center text-sm text-[var(--color-text-muted)]">
            No hay datos para el período seleccionado.
          </p>
        ) : (
          <svg
            aria-label="Gráfico de evolución del precio mínimo observado"
            className="h-[250px] w-full overflow-visible"
            preserveAspectRatio="none"
            role="group"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
              </linearGradient>
            </defs>
            {axisValues.map((value) => {
              const y = chartTop + plotHeight - (value / axisMax) * plotHeight
              return (
                <g key={value}>
                  <line
                    className="stroke-[var(--color-border)]"
                    opacity="0.45"
                    x1={chartLeft}
                    x2={chartWidth - chartRight}
                    y1={y}
                    y2={y}
                  />
                  <text
                    fill="#CBD5E1"
                    fontSize="14"
                    fontWeight="500"
                    textAnchor="end"
                    x={chartLeft - 8}
                    y={y + 4}
                  >
                    {formatPrice(value, currency)}
                  </text>
                </g>
              )
            })}
            {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#2563eb"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {dateTickIndexes.map((index) => {
              const point = pointsOnChart[index]
              if (!point) return null
              return (
                <text
                  fill="#CBD5E1"
                  fontSize="14"
                  fontWeight="500"
                  key={`${point.date}-${index}`}
                  textAnchor="middle"
                  x={point.x}
                  y={chartHeight - 8}
                >
                  {formatDate(point.date, { month: 'short' })}
                </text>
              )
            })}
            {pointsOnChart.map((point, index) => (
              <circle
                aria-label={`${formatDate(point.date, { dateStyle: 'long' })}: ${formatPrice(point.price, currency)}`}
                cx={point.x}
                cy={point.y}
                fill="#ffffff"
                key={point.date}
                onBlur={() => setActivePointIndex(null)}
                onFocus={() => setActivePointIndex(index)}
                onMouseEnter={() => setActivePointIndex(index)}
                onMouseLeave={() => setActivePointIndex(null)}
                r={activePoint?.date === point.date ? 6 : 4}
                stroke="#2563eb"
                strokeWidth="2"
                className="cursor-crosshair focus:outline-none"
                tabIndex={0}
              />
            ))}
            {activePoint && (
              <g pointerEvents="none">
                <rect
                  fill="#0b1120"
                  height="54"
                  rx="8"
                  stroke="#2563eb"
                  width="156"
                  x={Math.max(4, Math.min(chartWidth - 160, activePoint.x - 78))}
                  y={Math.max(2, activePoint.y - 64)}
                />
                <text
                  fill="#f8fafc"
                  fontSize="14"
                  fontWeight="700"
                  textAnchor="middle"
                  x={Math.max(82, Math.min(chartWidth - 82, activePoint.x))}
                  y={Math.max(22, activePoint.y - 40)}
                >
                  {formatPrice(activePoint.price, currency)}
                </text>
                <text
                  fill="#94a3b8"
                  fontSize="12"
                  textAnchor="middle"
                  x={Math.max(82, Math.min(chartWidth - 82, activePoint.x))}
                  y={Math.max(40, activePoint.y - 22)}
                >
                  {formatDate(activePoint.date, { dateStyle: 'medium' })}
                </text>
              </g>
            )}
          </svg>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">Precio actual</p>
          <p className="mt-1 text-lg font-bold text-blue-400">
            {currentPrice === null ? '—' : formatPrice(currentPrice, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">Mínimo histórico</p>
          <p className="mt-1 text-lg font-bold text-emerald-500">
            {lowestPoint ? formatPrice(lowestPoint.price, currency) : 'Sin datos'}
          </p>
          {lowestPoint && (
            <p className="text-xs text-[var(--color-text-muted)]">
              {formatDate(lowestPoint.date, { dateStyle: 'medium' })}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export default PriceHistoryChart
