// Football data for Home: today's scoreboard (all leagues — has live scores)
// + each starred team's next fixture (ESPN team endpoint — has kickoff, but
// no scores). Shared by the match tile, "Your teams" and the greeting line.

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer'
const FAV_TEAMS_KEY = 'ft:favorites:v1' // written by the Football page (team ids)
const MAX_TEAMS = 3

export function readFavTeams() {
  try { return (JSON.parse(localStorage.getItem(FAV_TEAMS_KEY) || '[]') ?? []).map(String).slice(0, MAX_TEAMS) }
  catch { return [] }
}

function side(comp, homeAway, fallbackIndex) {
  const c = comp.competitors?.find((x) => x.homeAway === homeAway) ?? comp.competitors?.[fallbackIndex]
  return {
    id: String(c?.team?.id ?? ''),
    name: c?.team?.shortDisplayName ?? c?.team?.displayName ?? '—',
    logo: c?.team?.logo ?? c?.team?.logos?.[0]?.href,
    score: typeof c?.score === 'string' || typeof c?.score === 'number' ? String(c.score) : null,
  }
}

// The all-leagues scoreboard carries no league name, but the season slug does:
// "2026-27-english-premier-league" → "English Premier League"
const UPPER = new Set(['uefa', 'fifa', 'mls', 'usl', 'afc', 'caf'])
function leagueFromSlug(slug) {
  if (!slug) return null
  return slug.replace(/^\d{4}(-\d{2,4})?-/, '').split('-')
    .map((w) => (UPPER.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

function parseEvent(e, league) {
  const comp = e.competitions?.[0] ?? {}
  const status = e.status ?? comp.status ?? {}
  return {
    id: String(e.id),
    date: e.date,
    league: league ?? e.league?.abbreviation ?? e.league?.name ?? leagueFromSlug(e.season?.slug) ?? comp.notes?.[0]?.headline ?? 'Match',
    state: status.type?.state ?? 'pre',      // pre | in | post
    detail: status.type?.shortDetail ?? '',  // "67'", "HT", "FT"
    home: side(comp, 'home', 0),
    away: side(comp, 'away', 1),
  }
}

export async function fetchScoreboard({ signal }) {
  const r = await fetch(`${ESPN}/all/scoreboard`, { signal })
  if (!r.ok) throw new Error('espn')
  const j = await r.json()
  return (j.events ?? []).map((e) => parseEvent(e))
}

// Live first, then the next kickoff, then the most recent result
export function pickFeatured(events = []) {
  const byDate = (dir) => (a, b) => dir * (new Date(a.date) - new Date(b.date))
  return events.find((e) => e.state === 'in')
    ?? events.filter((e) => e.state === 'pre').sort(byDate(1))[0]
    ?? events.filter((e) => e.state === 'post').sort(byDate(-1))[0]
    ?? null
}

export async function fetchFavTeams(ids, signal) {
  const results = await Promise.allSettled(ids.map(async (id) => {
    const r = await fetch(`${ESPN}/all/teams/${id}`, { signal })
    if (!r.ok) throw new Error('espn')
    const t = (await r.json()).team ?? {}
    const ne = t.nextEvent?.[0]
    return {
      id,
      name: t.shortDisplayName ?? t.displayName ?? '—',
      logo: t.logos?.[0]?.href,
      next: ne ? parseEvent(ne, ne.league?.abbreviation ?? ne.league?.shortName) : null,
    }
  }))
  return results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
}

// The fixture to show for a team: today's scoreboard entry (has the score)
// wins over the team endpoint's next event (kickoff only).
export function fixtureFor(team, events = []) {
  return events.find((e) => e.home.id === team.id || e.away.id === team.id) ?? team.next
}

// Most newsworthy first: live, then today's / upcoming kickoffs, then results
const STATE_RANK = { in: 0, pre: 1, post: 2 }
export function byUrgency(teams, events) {
  return [...teams].sort((a, b) =>
    (STATE_RANK[fixtureFor(a, events)?.state] ?? 3) - (STATE_RANK[fixtureFor(b, events)?.state] ?? 3))
}

// One line for the greeting — "Liverpool are drawing 0–0 (HT)",
// "Arsenal beat Spurs 2–1", "Inter play Milan at 20:45". Null if nothing
// worth saying (e.g. next match is weeks away).
export function describeFixture(team, ev, formatTime) {
  if (!ev) return null
  const isHome = ev.home.id === team.id
  const me = isHome ? ev.home : ev.away
  const them = isHome ? ev.away : ev.home
  const ms = Number(me.score), ts = Number(them.score)
  const score = `${me.score}–${them.score}`
  if (ev.state === 'in') {
    const verb = ms > ts ? 'are winning' : ms < ts ? 'are losing' : 'are drawing'
    return `${team.name} ${verb} ${score}${ev.detail ? ` (${ev.detail})` : ''}`
  }
  const when = new Date(ev.date)
  const days = Math.round((new Date(when).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000)
  if (ev.state === 'post') {
    if (days < -1) return null
    if (ms === ts) return `${team.name} drew ${score} with ${them.name}`
    return ms > ts ? `${team.name} beat ${them.name} ${score}` : `${team.name} lost ${score} to ${them.name}`
  }
  if (days < 0 || days > 6) return null
  const time = formatTime(when)
  const day = days === 0 ? 'at' : days === 1 ? 'tomorrow at' : `${when.toLocaleDateString('en-US', { weekday: 'long' })} at`
  return `${team.name} play ${them.name} ${day} ${time}`
}
