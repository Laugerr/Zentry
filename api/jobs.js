// Vercel serverless function — proxies Bundesagentur für Arbeit job search
// Runs server-side so there are no CORS restrictions.

const BA_BASE = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const params = new URLSearchParams(req.query)
  const url = `${BA_BASE}?${params}`

  try {
    const upstream = await fetch(url, {
      headers: { 'X-API-Key': 'jobboerse-jobsuche' },
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      return res.status(upstream.status).json({ error: `Upstream ${upstream.status}`, detail: text })
    }

    const data = await upstream.json()

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    return res.status(200).json(data)
  } catch (err) {
    return res.status(502).json({ error: 'Upstream request failed', detail: err.message })
  }
}
