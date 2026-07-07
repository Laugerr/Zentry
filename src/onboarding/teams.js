// ESPN's /teams list sends no CORS header (browsers block it), but the
// standings endpoint does — and lists every club in the league, crests included.
const STANDINGS = 'https://site.api.espn.com/apis/v2/sports/soccer'

const logo = (id) => `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`

// One-tap picks on the setup screen (ESPN team ids, verified)
export const POPULAR_TEAMS = [
  { id: '86',  name: 'Real Madrid' },
  { id: '83',  name: 'Barcelona' },
  { id: '382', name: 'Man City' },
  { id: '364', name: 'Liverpool' },
  { id: '359', name: 'Arsenal' },
  { id: '132', name: 'Bayern' },
  { id: '160', name: 'PSG' },
  { id: '110', name: 'Inter' },
].map((t) => ({ ...t, logo: logo(t.id) }))

// Searchable catalogue — every club in these leagues
const LEAGUES = [
  ['eng.1', 'Premier League'], ['esp.1', 'La Liga'], ['ger.1', 'Bundesliga'],
  ['ita.1', 'Serie A'], ['fra.1', 'Ligue 1'], ['por.1', 'Primeira Liga'],
  ['ned.1', 'Eredivisie'], ['tur.1', 'Süper Lig'], ['usa.1', 'MLS'],
]

export async function fetchAllTeams({ signal }) {
  const lists = await Promise.allSettled(LEAGUES.map(async ([id, league]) => {
    const r = await fetch(`${STANDINGS}/${id}/standings`, { signal })
    if (!r.ok) throw new Error('espn')
    // One table per group/conference (MLS has two) — flatten them
    const groups = (await r.json()).children ?? []
    return groups.flatMap((g) => g.standings?.entries ?? []).map(({ team: t }) => ({
      id: String(t.id), name: t.displayName, short: t.shortDisplayName,
      logo: t.logos?.[0]?.href ?? logo(t.id), league,
    }))
  }))
  const seen = new Set()
  return lists
    .flatMap((l) => (l.status === 'fulfilled' ? l.value : []))
    .filter((t) => !seen.has(t.id) && seen.add(t.id))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Accent- and case-insensitive ("munchen" finds "München")
const fold = (s) => (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
export function searchTeams(teams, query, limit = 8) {
  const q = fold(query.trim())
  if (q.length < 2) return []
  return teams.filter((t) => fold(t.name).includes(q) || fold(t.short).includes(q)).slice(0, limit)
}
