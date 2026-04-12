import { useState } from 'react'
import { Search, ExternalLink, AlertCircle, MapPin, Building2, Euro, Calendar } from 'lucide-react'

// ─── API helpers ────────────────────────────────────────────────────────────

/**
 * Fetch jobs from Bundesagentur für Arbeit (German Federal Employment Agency).
 * Documentation: https://jobsuche.api.bund.dev/
 * No API key required — completely free and open.
 */
async function fetchArbeitsagentur({ keywords, city, radiusKm }) {
  const params = new URLSearchParams({
    was: keywords,
    wo: city,
    umkreis: String(radiusKm),
    size: 25,
    page: 1,
  })

  const res = await fetch(
    `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs?${params}`,
    {
      headers: {
        'X-API-Key': 'jobboerse-jobsuche', // public key published in official docs
      },
    }
  )

  if (!res.ok) throw new Error(`Arbeitsagentur API error: ${res.status}`)
  const data = await res.json()

  // Normalize results to shared shape
  return (data.stellenangebote ?? []).map((job) => ({
    id: job.refnr,
    title: job.titel,
    company: job.arbeitgeber ?? 'Unknown',
    location: [job.arbeitsort?.ort, job.arbeitsort?.region]
      .filter(Boolean)
      .join(', '),
    salary: null, // Arbeitsagentur rarely exposes salary
    datePosted: job.eintrittsdatum ?? job.aktuelleVeroeffentlichungsdatum,
    applyUrl: `https://www.arbeitsagentur.de/jobsuche/jobdetail/${job.refnr}`,
    source: 'Arbeitsagentur',
  }))
}

/**
 * Fetch jobs from Adzuna (requires free API key from adzuna.com/developers).
 * Set VITE_ADZUNA_APP_ID and VITE_ADZUNA_APP_KEY in your .env file.
 */
async function fetchAdzuna({ keywords, city, radiusKm }) {
  const appId = import.meta.env.VITE_ADZUNA_APP_ID
  const appKey = import.meta.env.VITE_ADZUNA_APP_KEY

  if (!appId || !appKey) {
    throw new Error(
      'Adzuna API keys are missing. Add VITE_ADZUNA_APP_ID and VITE_ADZUNA_APP_KEY to your .env file.'
    )
  }

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: keywords,
    where: city,
    distance: String(radiusKm),
    results_per_page: 25,
  })

  const res = await fetch(
    `https://api.adzuna.com/v1/api/jobs/de/search/1?${params}`
  )

  if (!res.ok) throw new Error(`Adzuna API error: ${res.status}`)
  const data = await res.json()

  // Normalize results to shared shape
  return (data.results ?? []).map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company?.display_name ?? 'Unknown',
    location: job.location?.display_name ?? '',
    salary:
      job.salary_min != null
        ? `€${Math.round(job.salary_min).toLocaleString()} – €${Math.round(
            job.salary_max
          ).toLocaleString()}`
        : null,
    datePosted: job.created,
    applyUrl: job.redirect_url,
    source: 'Adzuna',
  }))
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SourceBadge({ source }) {
  return (
    <span className={`badge ${source === 'Adzuna' ? 'badge-orange' : 'badge-purple'}`}>
      {source}
    </span>
  )
}

function ResultsTable({ jobs }) {
  if (jobs.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: 'var(--text-muted)',
        }}
      >
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
            <th>Salary</th>
            <th>Posted</th>
            <th style={{ textAlign: 'right' }}>Apply</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', maxWidth: 260 }}>
                  {job.title}
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Building2 size={13} strokeWidth={1.5} style={{ opacity: 0.5, flexShrink: 0 }} />
                  {job.company}
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MapPin size={13} strokeWidth={1.5} style={{ opacity: 0.5, flexShrink: 0 }} />
                  {job.location || '—'}
                </div>
              </td>
              <td>
                {job.salary ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Euro size={13} strokeWidth={1.5} style={{ opacity: 0.5, flexShrink: 0 }} />
                    {job.salary}
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Not specified
                  </span>
                )}
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={13} strokeWidth={1.5} style={{ opacity: 0.5, flexShrink: 0 }} />
                  {job.datePosted
                    ? new Date(job.datePosted).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : '—'}
                </div>
              </td>
              <td style={{ textAlign: 'right' }}>
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none' }}
                >
                  Apply
                  <ExternalLink size={11} />
                </a>
              </td>
            </tr>
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

export default function JobHunter() {
  const [source, setSource] = useState('arbeitsagentur') // 'arbeitsagentur' | 'adzuna'
  const [keywords, setKeywords] = useState('')
  const [city, setCity] = useState('')
  const [radius, setRadius] = useState(25)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [resultSource, setResultSource] = useState(null)

  async function handleSearch(e) {
    e.preventDefault()
    if (!keywords.trim() && !city.trim()) return

    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const params = { keywords: keywords.trim(), city: city.trim(), radiusKm: radius }
      const results =
        source === 'arbeitsagentur'
          ? await fetchArbeitsagentur(params)
          : await fetchAdzuna(params)

      setJobs(results)
      setResultSource(source === 'arbeitsagentur' ? 'Arbeitsagentur' : 'Adzuna')
    } catch (err) {
      setError(err.message)
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 1100 }}>
      {/* Page heading */}
      <div>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            marginBottom: '0.25rem',
            letterSpacing: '-0.03em',
          }}
        >
          <span className="gradient-text">Job Hunter</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Search German job listings from two live sources.
        </p>
      </div>

      {/* Source toggle + search form */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Segmented control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span className="label" style={{ margin: 0 }}>Source</span>
          <div className="segmented">
            <button
              className={`segmented-option ${source === 'arbeitsagentur' ? 'active' : ''}`}
              onClick={() => setSource('arbeitsagentur')}
            >
              Arbeitsagentur
            </button>
            <button
              className={`segmented-option ${source === 'adzuna' ? 'active' : ''}`}
              onClick={() => setSource('adzuna')}
            >
              Adzuna
            </button>
          </div>
          {source === 'adzuna' && (
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Requires API keys in .env
            </span>
          )}
        </div>

        {/* Search fields */}
        <form onSubmit={handleSearch}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <label className="label">Keywords</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Cybersecurity, IT"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>
            <div>
              <label className="label">City</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Lübeck, Hamburg"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Radius</label>
              <select
                className="input"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              >
                {RADIUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            className="btn-primary"
            type="submit"
            disabled={loading || (!keywords.trim() && !city.trim())}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {loading ? (
              <>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
                Searching…
              </>
            ) : (
              <>
                <Search size={14} />
                Search Jobs
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '10px',
            color: '#f87171',
          }}
        >
          <AlertCircle size={18} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              API Error
            </div>
            <div style={{ fontSize: '0.82rem', opacity: 0.8 }}>{error}</div>
          </div>
        </div>
      )}

      {/* Results */}
      {hasSearched && !loading && !error && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Results header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {jobs.length > 0
                ? `${jobs.length} result${jobs.length !== 1 ? 's' : ''} found`
                : 'No results'}
            </div>
            {resultSource && <SourceBadge source={resultSource} />}
          </div>

          <ResultsTable jobs={jobs} />
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
            padding: '3rem',
            color: 'var(--text-muted)',
          }}
        >
          <div className="spinner" />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
            Fetching jobs…
          </span>
        </div>
      )}
    </div>
  )
}
