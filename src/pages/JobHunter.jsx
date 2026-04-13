import { useState } from 'react'
import { Search, ExternalLink, AlertCircle, MapPin, Building2, Calendar, Briefcase, Clock, Download, Mail } from 'lucide-react'

// ─── Arbeitsagentur API ───────────────────────────────────────────────────────

const proxy = (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`
const BA_BASE = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4'
const BA_HEADERS = { 'X-API-Key': 'jobboerse-jobsuche' }

const WORK_TYPE_LABEL = {
  VOLLZEIT:    'Full-time',
  TEILZEIT:    'Part-time',
  HOMEOFFICE:  'Remote',
  MINIJOB:     'Minijob',
  SCHICHT:     'Shift',
  NACHTARBEIT: 'Night',
  WOCHENENDE:  'Weekend',
}

const WORK_TYPE_COLOR = {
  VOLLZEIT:   { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
  TEILZEIT:   { bg: 'rgba(244,114,182,0.15)', color: '#f472b6' },
  HOMEOFFICE: { bg: 'rgba(52,211,153,0.15)',  color: '#34d399' },
  MINIJOB:    { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
}

function mapJob(job) {
  return {
    id:         job.refnr,
    refnr:      job.refnr,
    title:      job.titel ?? '—',
    profession: job.beruf ?? null,
    company:    job.arbeitgeber ?? 'Unknown',
    city:       job.arbeitsort?.ort ?? null,
    region:     job.arbeitsort?.region ?? null,
    plz:        job.arbeitsort?.plz ?? null,
    workTypes:  job.arbeitszeitmodelle ?? [],
    contract:   job.befristung ?? null,   // 1 = permanent, 2 = fixed-term
    datePosted: job.aktuelleVeroeffentlichungsdatum ?? null,
    startDate:  job.eintrittsdatum ?? null,
    applyUrl:   `https://www.arbeitsagentur.de/jobsuche/jobdetail/${job.refnr}`,
  }
}

async function searchArbeitsagentur({ keywords, city, radiusKm }) {
  const fetchPage = async (page) => {
    const params = new URLSearchParams({ was: keywords, wo: city, umkreis: String(radiusKm), size: 25, page })
    const res = await fetch(proxy(`${BA_BASE}/jobs?${params}`), { headers: BA_HEADERS })
    if (!res.ok) throw new Error(`Arbeitsagentur returned ${res.status}`)
    const data = await res.json()
    return (data.stellenangebote ?? []).map(mapJob)
  }

  // Fetch 3 pages in parallel → up to 75 results
  const settled = await Promise.allSettled([fetchPage(1), fetchPage(2), fetchPage(3)])
  const all = settled.filter((p) => p.status === 'fulfilled').flatMap((p) => p.value)

  // Deduplicate by refnr
  const seen = new Set()
  const unique = all.filter((job) => {
    if (seen.has(job.refnr)) return false
    seen.add(job.refnr)
    return true
  })

  // Sort by most recent published date first
  return unique.sort((a, b) => {
    const da = a.datePosted ? new Date(a.datePosted) : new Date(0)
    const db = b.datePosted ? new Date(b.datePosted) : new Date(0)
    return db - da
  })
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function fmt(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return isNaN(d) ? '' : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function downloadCSV(jobs, emails) {
  const headers = ['Title', 'Profession', 'Company', 'City', 'Postal Code', 'Published', 'Start Date', 'Email', 'Apply URL']
  const filledJobs = jobs.filter((job) => emails[job.refnr]?.trim())
  if (filledJobs.length === 0) return alert('No emails filled in yet.')

  const rows = filledJobs.map((job) => [
    job.title,
    job.profession ?? '',
    job.company,
    job.city ?? job.region ?? '',
    job.plz ?? '',
    fmt(job.datePosted),
    fmt(job.startDate),
    emails[job.refnr] ?? '',
    job.applyUrl,
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n')

  // BOM ensures Excel opens UTF-8 correctly (handles ä, ö, ü, etc.)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `jobs_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WorkTypeBadge({ type }) {
  const label = WORK_TYPE_LABEL[type] ?? type
  const style = WORK_TYPE_COLOR[type] ?? { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' }
  return (
    <span style={{
      fontSize: '0.68rem', fontWeight: 600, padding: '0.18rem 0.5rem',
      borderRadius: '4px', background: style.bg, color: style.color,
      whiteSpace: 'nowrap', letterSpacing: '0.02em',
    }}>
      {label}
    </span>
  )
}

function ContractBadge({ contract }) {
  if (!contract) return <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
  const isPermanent = contract === 1
  return (
    <span style={{
      fontSize: '0.68rem', fontWeight: 600, padding: '0.18rem 0.5rem', borderRadius: '4px',
      background: isPermanent ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)',
      color: isPermanent ? '#34d399' : '#fbbf24',
      whiteSpace: 'nowrap',
    }}>
      {isPermanent ? 'Permanent' : 'Fixed-term'}
    </span>
  )
}

function JobRow({ job, email, onEmailChange }) {
  const location = [job.city, job.plz].filter(Boolean).join(' ') || job.region || '—'

  return (
    <tr>
      {/* Title + profession */}
      <td style={{ minWidth: 180 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{job.title}</div>
        {job.profession && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Briefcase size={10} strokeWidth={1.5} style={{ opacity: 0.6 }} />
            {job.profession}
          </div>
        )}
      </td>

      {/* Company */}
      <td style={{ minWidth: 130 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Building2 size={13} strokeWidth={1.5} style={{ opacity: 0.45, flexShrink: 0 }} />
          <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.company}
          </span>
        </div>
      </td>

      {/* Location */}
      <td style={{ minWidth: 110 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <MapPin size={13} strokeWidth={1.5} style={{ opacity: 0.45, flexShrink: 0 }} />
          <span>{location}</span>
        </div>
      </td>

      {/* Published */}
      <td style={{ minWidth: 95, whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
          <Calendar size={12} strokeWidth={1.5} style={{ opacity: 0.45 }} />
          {fmt(job.datePosted) || '—'}
        </div>
      </td>

      {/* Start date + status */}
      <td style={{ minWidth: 130 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
            <Clock size={12} strokeWidth={1.5} style={{ opacity: 0.45 }} />
            {fmt(job.startDate) || '—'}
          </div>
          {job.startDate && (() => {
            const start = new Date(job.startDate)
            const today = new Date(); today.setHours(0, 0, 0, 0)
            const diffDays = Math.round((start - today) / 86400000)
            if (diffDays < 0)
              return <span style={{ fontSize: '0.66rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>Expired</span>
            if (diffDays === 0)
              return <span style={{ fontSize: '0.66rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>Starts today</span>
            if (diffDays <= 14)
              return <span style={{ fontSize: '0.66rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>In {diffDays}d</span>
            return <span style={{ fontSize: '0.66rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>Open</span>
          })()}
        </div>
      </td>

      {/* Email — manually filled */}
      <td style={{ minWidth: 180 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Mail size={12} strokeWidth={1.5} style={{ opacity: 0.35, flexShrink: 0 }} />
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="Add email…"
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              color: email ? 'var(--text-primary)' : undefined,
              fontSize: '0.78rem',
              padding: '0.2rem 0.1rem',
              width: '100%',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </td>

      {/* Actions */}
      <td style={{ textAlign: 'right' }}>
        <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none', padding: '0.4rem 0.65rem', whiteSpace: 'nowrap' }}>
          Apply <ExternalLink size={11} />
        </a>
      </td>
    </tr>
  )
}

function ResultsTable({ jobs, emails, onEmailChange }) {
  if (jobs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
        <Search size={36} strokeWidth={1} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
          No results found. Try different keywords or a wider radius.
        </p>
      </div>
    )
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Job Title</th>
            <th>Company</th>
            <th>Location</th>
            <th>Published</th>
            <th>Start Date</th>
            <th>Email</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              email={emails[job.refnr] ?? ''}
              onEmailChange={(val) => onEmailChange(job.refnr, val)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const RADIUS_OPTIONS = [
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
  { label: '50 km', value: 50 },
  { label: '100 km', value: 100 },
]

const KEYWORD_SUGGESTIONS = [
  'IT', 'Cybersecurity', 'IT-Sicherheit', 'Netzwerktechniker', 'Systemadministrator',
  'Software Developer', 'Softwareentwickler', 'Frontend Developer', 'Backend Developer',
  'Full Stack Developer', 'DevOps', 'Cloud Engineer', 'Data Analyst', 'Data Scientist',
  'Machine Learning', 'Künstliche Intelligenz', 'Projektmanager', 'IT-Consultant',
  'Support', 'Helpdesk', 'Fachinformatiker', 'Wirtschaftsinformatiker',
  'Marketing', 'Online Marketing', 'SEO', 'Grafikdesigner', 'UX Designer',
  'Buchhalter', 'Controlling', 'Steuerberater', 'Vertrieb', 'Außendienst',
  'Kundenservice', 'Personalwesen', 'HR', 'Logistik', 'Einkauf',
  'Ingenieur', 'Maschinenbau', 'Elektrotechnik', 'Mechatroniker', 'Elektriker',
  'Krankenpfleger', 'Altenpfleger', 'Erzieher', 'Lehrer', 'Arzt',
  'Koch', 'Fahrer', 'Lagerarbeiter', 'Bauarbeiter', 'Handwerker',
]

const CITY_SUGGESTIONS = [
  'Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt am Main',
  'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dortmund', 'Essen',
  'Bremen', 'Dresden', 'Hannover', 'Nürnberg', 'Duisburg',
  'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster',
  'Karlsruhe', 'Mannheim', 'Augsburg', 'Wiesbaden', 'Gelsenkirchen',
  'Mönchengladbach', 'Braunschweig', 'Chemnitz', 'Kiel', 'Aachen',
  'Halle', 'Magdeburg', 'Freiburg im Breisgau', 'Krefeld', 'Lübeck',
  'Oberhausen', 'Erfurt', 'Mainz', 'Rostock', 'Kassel',
  'Hagen', 'Hamm', 'Saarbrücken', 'Mülheim an der Ruhr', 'Potsdam',
  'Oldenburg', 'Leverkusen', 'Osnabrück', 'Heidelberg', 'Darmstadt',
]

export default function JobHunter() {
  const [keywords, setKeywords] = useState('')
  const [city, setCity]         = useState('')
  const [radius, setRadius]     = useState(25)
  const [jobs, setJobs]         = useState([])
  const [emails, setEmails]     = useState({})   // { [refnr]: email }
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  function handleEmailChange(refnr, value) {
    setEmails((prev) => ({ ...prev, [refnr]: value }))
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!keywords.trim() && !city.trim()) return
    setLoading(true)
    setError(null)
    setHasSearched(true)
    setJobs([])
    setEmails({})
    try {
      const results = await searchArbeitsagentur({ keywords: keywords.trim(), city: city.trim(), radiusKm: radius })
      setJobs(results)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 1300 }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', letterSpacing: '-0.03em' }}>
          <span className="gradient-text">Job Hunter</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Search German job listings via the Bundesagentur für Arbeit. Fill in emails manually, then export everything to CSV.
        </p>
      </div>

      {/* Search form */}
      <div className="card">
        <form onSubmit={handleSearch}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="label">Keywords</label>
              <input className="input" type="text" placeholder="e.g. Cybersecurity, IT"
                list="keywords-list"
                value={keywords} onChange={(e) => setKeywords(e.target.value)} />
              <datalist id="keywords-list">
                {KEYWORD_SUGGESTIONS.map((k) => <option key={k} value={k} />)}
              </datalist>
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" type="text" placeholder="e.g. Lübeck, Hamburg"
                list="city-list"
                value={city} onChange={(e) => setCity(e.target.value)} />
              <datalist id="city-list">
                {CITY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="label">Radius</label>
              <select className="input" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
                {RADIUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                Search area around the city
              </span>
            </div>
          </div>
          <button className="btn-primary" type="submit"
            disabled={loading || (!keywords.trim() && !city.trim())}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            {loading ? (
              <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Searching…</>
            ) : (
              <><Search size={14} />Search Jobs</>
            )}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem 1.25rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#f87171' }}>
          <AlertCircle size={18} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Error</div>
            <div style={{ fontSize: '0.82rem', opacity: 0.8 }}>{error}</div>
          </div>
        </div>
      )}

      {/* Results */}
      {hasSearched && !loading && !error && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {jobs.length > 0 ? `${jobs.length} result${jobs.length !== 1 ? 's' : ''} found` : 'No results'}
              </span>
              <span className="badge badge-purple">Bundesagentur für Arbeit</span>
            </div>
            {jobs.length > 0 && (
              <button className="btn-ghost"
                onClick={() => downloadCSV(jobs, emails)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem' }}>
                <Download size={13} /> Export CSV
              </button>
            )}
          </div>
          <ResultsTable jobs={jobs} emails={emails} onEmailChange={handleEmailChange} />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '3rem', color: 'var(--text-muted)' }}>
          <div className="spinner" />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>Fetching jobs… (3 pages)</span>
        </div>
      )}
    </div>
  )
}
