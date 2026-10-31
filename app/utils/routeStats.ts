// The numbers inside a route, for the route wall's filters. A route has its distance (km) and a free list of labelled figures
// read from its screenshot ("Pace 8:09 /km", "Time 40m 47s", "Elev Gain 29 m", "Avg HR 179 bpm", "Cadence 172 spm"…). Known figures
// get friendly names and formats; any other figure that starts with a number becomes a filter of its own, so a new kind of
// screenshot needs no code change. A route simply has no value for a figure its screenshot did not show.
export type RouteLike = { km?: number; stats?: { label: string; value: string }[] }
export type MetricInfo = { key: string; label: string; unit: string; step: number; fmt: (n: number) => string }

const num = (s: string) => Number(s.replace(/,/g, ''))
const clock = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, '0')}m` : `${Math.round(min)}m`)
const pace = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`

export const KNOWN: Record<string, MetricInfo> = {
  distance: { key: 'distance', label: 'Distance', unit: 'km', step: 0.1, fmt: n => `${n.toFixed(1)} km` },
  pace: { key: 'pace', label: 'Pace', unit: '/km', step: 5, fmt: n => `${pace(n)} /km` },
  time: { key: 'time', label: 'Time', unit: '', step: 1, fmt: clock },
  elev: { key: 'elev', label: 'Elevation gain', unit: 'm', step: 1, fmt: n => `${Math.round(n)} m` },
  hr: { key: 'hr', label: 'Heart rate', unit: 'bpm', step: 1, fmt: n => `${Math.round(n)} bpm` },
  cal: { key: 'cal', label: 'Calories', unit: 'cal', step: 5, fmt: n => `${Math.round(n)} cal` },
  speed: { key: 'speed', label: 'Speed', unit: 'km/h', step: 0.1, fmt: n => `${n.toFixed(1)} km/h` }, // rides
  power: { key: 'power', label: 'Power', unit: 'W', step: 1, fmt: n => `${Math.round(n)} W` },
  cadence: { key: 'cadence', label: 'Cadence', unit: 'spm', step: 1, fmt: n => `${Math.round(n)} spm` }
}

// "8:09 /km" -> seconds per km; "40m 47s", "2h 44m", "1:02:15" -> minutes
const toPace = (v: string) => { const m = v.match(/(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : undefined }
function toMinutes(v: string) {
  const c = v.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/)
  if (c) return Number(c[1] ?? 0) * 60 + Number(c[2]) + Number(c[3]) / 60
  const h = v.match(/(\d+)\s*h/i), m = v.match(/(\d+)\s*m(?!\w)/i), s = v.match(/(\d+)\s*s\b/i)
  return h || m || s ? Number(h?.[1] ?? 0) * 60 + Number(m?.[1] ?? 0) + Number(s?.[1] ?? 0) / 60 : undefined
}

export function routeMetrics(r: RouteLike): Record<string, number> {
  const out: Record<string, number> = {}
  if (r.km) out.distance = r.km
  for (const { label, value } of r.stats ?? []) {
    const l = label.toLowerCase().trim(), v = value.trim()
    let key = '', n: number | undefined
    const lead = () => (/^\d/.test(v) ? num(v.match(/^[\d,.]+/)![0]) : undefined)
    if (/^max/.test(l)) { key = `x:${l}`; n = lead() } // "Max Elev" is its own figure, never the elevation gain
    else if (/^(avg\.?\s*)?pace$/.test(l)) { key = 'pace'; n = toPace(v) }
    else if (/^gap$/.test(l)) continue
    else if (/speed/.test(l)) { key = 'speed'; n = lead() }
    else if (/power|watt/.test(l)) { key = 'power'; n = lead() }
    else if (/cadence/.test(l)) { key = 'cadence'; n = lead() }
    else if (/time|moving|elapsed/.test(l)) { key = 'time'; n = toMinutes(v) }
    else if (/elev|gain|climb/.test(l)) { key = 'elev'; n = /^\d/.test(v) ? num(v.match(/^[\d,.]+/)![0]) : undefined }
    else if (/\bhr\b|heart/.test(l)) { key = 'hr'; n = /^\d/.test(v) ? num(v.match(/^[\d,.]+/)![0]) : undefined }
    else if (/^cal/.test(l)) { key = 'cal'; n = /^\d/.test(v) ? num(v.match(/^[\d,.]+/)![0]) : undefined }
    else if (/^\d/.test(v)) { key = `x:${l}`; n = num(v.match(/^[\d,.]+/)![0]) } // any other figure: its own filter
    if (key && n !== undefined && Number.isFinite(n) && !(key in out)) out[key] = n
  }
  return out
}

// How a figure is named and shown. Unknown figures borrow the label and unit their screenshot used ("Cadence", "spm").
export function metricInfo(key: string, routes: RouteLike[]): MetricInfo {
  if (KNOWN[key]) return KNOWN[key]!
  const l = key.slice(2)
  const sample = routes.flatMap(r => r.stats ?? []).find(s => s.label.toLowerCase().trim() === l)
  const unit = sample?.value.replace(/^[\d,.\s]+/, '').trim() ?? ''
  return { key, label: sample?.label ?? l, unit, step: 1, fmt: n => `${Math.round(n * 10) / 10}${unit ? ` ${unit}` : ''}` }
}
export const METRIC_ORDER = ['distance', 'pace', 'speed', 'time', 'elev', 'hr', 'power', 'cadence', 'cal']

// Which figures to offer for what is on screen. Runs and rides are not measured alike (pace and heart rate on runs, speed and power on
// rides), so with "All" only figures both have are offered, and Runs or Rides adds that kind's own. A kind with fewer than 3 routes
// cannot carry a filter and is ignored. A figure also needs at least two different values to be worth a slider.
export function visibleMetrics(routes: (RouteLike & { kind: string })[], kind: 'all' | 'run' | 'ride'): string[] {
  const m = routes.map(routeMetrics)
  const kinds = (kind === 'all' ? [...new Set(routes.map(r => r.kind))] : [kind]).filter(k => routes.filter(r => r.kind === k).length >= 3)
  const pool = routes.map((r, i) => ({ r, m: m[i]! })).filter(x => kind === 'all' || x.r.kind === kind)
  const keys = new Set(pool.flatMap(x => Object.keys(x.m)))
  return [...keys].filter(key => {
    const vals = pool.map(x => x.m[key]).filter((v): v is number => v !== undefined)
    const everyKind = (kinds.length ? kinds : [kind]).every(k => pool.filter(x => x.r.kind === k && x.m[key] !== undefined).length >= 3)
    return everyKind && new Set(vals).size >= 2
  })
}
