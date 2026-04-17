<div align="center">

# ⚡ Zentry

### Personal Life Dashboard

<p>
  <a href="https://zentry-ecru.vercel.app"><img src="https://img.shields.io/badge/🌐_Live_Demo-zentry--ecru.vercel.app-a78bfa?style=for-the-badge&labelColor=0a0a0f" /></a>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-a78bfa?style=for-the-badge" />
</p>

<p>
  <img src="https://img.shields.io/badge/No%20API%20Keys%20Required-34d399?style=flat-square" />
  <img src="https://img.shields.io/badge/Zero%20Paywalls-34d399?style=flat-square" />
  <img src="https://img.shields.io/badge/Dark%20Theme-0a0a0f?style=flat-square&logoColor=white" />
</p>

**A dark, minimal dashboard with six tools — all free, all in one place.**

<p>
  <a href="https://zentry-ecru.vercel.app">
    <img src="https://img.shields.io/badge/🚀%20Try%20it%20Live-Zentry-8b5cf6?style=for-the-badge&labelColor=1a1a2e" height="40" />
  </a>
</p>

</div>

---

## 🧰 Tools

<table>
  <tr>
    <td>📰</td>
    <td><strong>News Tracker</strong></td>
    <td>Live RSS feeds from 32 countries across Africa, Europe, Asia & the Americas. Category filters, country stats, auto-refresh every 5 min.</td>
  </tr>
  <tr>
    <td>💼</td>
    <td><strong>Job Hunter</strong></td>
    <td>Search German job listings via the Bundesagentur für Arbeit. No API key needed, proxied through Vercel.</td>
  </tr>
  <tr>
    <td>📚</td>
    <td><strong>Language Planner</strong></td>
    <td>Weekly language learning tracker. Multiple languages, progress stored locally per language.</td>
  </tr>
  <tr>
    <td>📄</td>
    <td><strong>CV Builder</strong></td>
    <td>Build a German-format Lebenslauf with live preview, PDF export, and two templates.</td>
  </tr>
  <tr>
    <td>📻</td>
    <td><strong>Live Radio</strong></td>
    <td>Interactive world map with up to 1,500 live radio stations color-coded across 22 genres. Station list sidebar, ★ favourites, recent history, sleep timer, shuffle/next/prev, and full keyboard shortcuts (Space · M · N · P · S · ↑↓).</td>
  </tr>
  <tr>
    <td>⚽</td>
    <td><strong>Football Today</strong></td>
    <td>Live fixtures, scores & standings across 14 competitions. Date navigator, status filters (live/upcoming/finished), team search, ★ favourite teams, expandable match details (goals, cards, stats), and league tables — all auto-refreshing.</td>
  </tr>
</table>

---

## 🛠 Tech Stack

<p>
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/React_Router-CA4245?style=flat-square&logo=react-router&logoColor=white" />
  <img src="https://img.shields.io/badge/Lucide-f472b6?style=flat-square" />
  <img src="https://img.shields.io/badge/react--simple--maps-60a5fa?style=flat-square" />
  <img src="https://img.shields.io/badge/JetBrains_Mono-000000?style=flat-square&logo=jetbrains&logoColor=white" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white" />
</p>

---

## 🌐 APIs Used

> All free — no keys required.

| API | Purpose |
|---|---|
| codetabs · rss2json · allorigins | RSS proxy chain for News Tracker |
| Bundesagentur für Arbeit | Job listings (via Vercel serverless proxy) |
| Radio Browser API | Live radio stations & stream URLs |
| ESPN public scoreboard | Football fixtures & live scores |
| BBC Sport RSS + The Guardian RSS | Football news feeds |
| Open-Meteo | Weather — sidebar & country stats |
| ipinfo.io | Location detection for local weather |
| restcountries.com | Country info & flags in News Tracker |

---

## 🚀 Local Setup

```bash
git clone https://github.com/Laugerr/Zentry.git
cd Zentry
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 📁 Project Structure

```
Zentry/
├── api/
│   └── jobs.js                  # Vercel serverless proxy → Bundesagentur API
├── src/
│   ├── App.jsx                  # Routes
│   ├── components/
│   │   └── Layout.jsx           # Sidebar · header · weather · clock
│   └── pages/
│       ├── NewsTracker.jsx      # 📰 32-country news feeds
│       ├── JobHunter.jsx        # 💼 German job search
│       ├── LanguagePlanner.jsx  # 📚 Weekly learning tracker
│       ├── CVBuilder.jsx        # 📄 Lebenslauf builder
│       ├── LiveRadio.jsx        # 📻 World radio map
│       └── FootballToday.jsx    # ⚽ Live scores & feeds
└── vercel.json
```

---

## ➕ Adding a New Tool

1. Create `src/pages/YourTool.jsx`
2. Add a route in `src/App.jsx`
3. Add a nav entry in `Layout.jsx` inside `NAV_ITEMS`

```js
{ path: '/your-tool', icon: YourIcon, label: 'Your Tool', description: 'Short description' }
```

---

<div align="center">
  <sub>Built by <a href="https://github.com/Laugerr">Lauger</a></sub>
</div>
