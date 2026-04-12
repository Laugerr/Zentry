# ⚡ Zentry — Personal Life Dashboard

> A dark, modern personal dashboard built with **React + Vite + Tailwind CSS**, inspired by [codedex.io](https://www.codedex.io). Persistent sidebar, smooth page transitions, and tools to manage your career and learning — all in one place.

---

## 🧰 Tools

| Tool | Description |
|---|---|
| 💼 **Job Hunter** | Search German job listings via Arbeitsagentur (free, no key) or Adzuna (free key required) |
| 📚 **Language Planner** | Weekly learning tracker with per-language localStorage persistence |

---

## 🚀 Quick Start

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/Zentry.git
cd Zentry
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Adzuna API keys (see section below). The Arbeitsagentur source works without any keys.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Getting Adzuna API Keys (Free)

Adzuna provides free API access for personal/non-commercial projects.

1. Go to [https://developer.adzuna.com/](https://developer.adzuna.com/)
2. Click **Sign Up** and create an account
3. Once logged in, go to **My Apps** → **Create new application**
4. Fill in your app details (name, description, URL)
5. Copy your **app_id** and **app_key**
6. Add them to your `.env` file:

```env
VITE_ADZUNA_APP_ID=your_app_id_here
VITE_ADZUNA_APP_KEY=your_app_key_here
```

> 🔒 The `.env` file is listed in `.gitignore` — your keys will never be committed to git.

---

## 🌐 Deploying to GitHub Pages

### 1. Update `vite.config.js`

Set the `base` to match your GitHub repository name:

```js
// vite.config.js
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/YOUR-REPO-NAME/',  // ← change this
})
```

### 2. Deploy

```bash
npm run deploy
```

This runs `npm run build` then pushes the `dist/` folder to the `gh-pages` branch. Your app will be live at `https://YOUR_USERNAME.github.io/YOUR-REPO-NAME/`.

> **⚙️ First-time setup:** In your GitHub repo, go to **Settings → Pages** and set the source branch to `gh-pages`.

---

## 🗂 Project Structure

```
src/
├── App.jsx                   # Router setup — add new routes here
├── main.jsx                  # React entry point
├── index.css                 # Global styles + Tailwind + design tokens
├── components/
│   └── Layout.jsx            # Persistent sidebar + header + page wrapper
└── pages/
    ├── JobHunter.jsx         # 💼 Tool 1 — job search
    └── LanguagePlanner.jsx   # 📚 Tool 2 — weekly language tracker
```

### ➕ Adding a New Tool

1. Create `src/pages/YourTool.jsx`
2. Add a route in `src/App.jsx`:
   ```jsx
   <Route path="your-tool" element={<YourTool />} />
   ```
3. Add a nav entry in `src/components/Layout.jsx` inside the `NAV_ITEMS` array:
   ```js
   { path: '/your-tool', icon: YourIcon, label: 'Your Tool', description: 'Short description' }
   ```

---

## 🛠 Tech Stack

| | |
|---|---|
| ⚛️ Framework | React 19 + Vite 8 |
| 🎨 Styling | Tailwind CSS v4 (via `@tailwindcss/vite` plugin) |
| 🔀 Routing | React Router v7 (HashRouter for GitHub Pages compatibility) |
| 🖼 Icons | Lucide React |
| 🔤 Fonts | JetBrains Mono (headings) + Inter (body) |
| 🚀 Deployment | GitHub Pages via `gh-pages` |

---

## 💼 Job Hunter — API Details

### 🇩🇪 Arbeitsagentur (German Federal Employment Agency)
- **Endpoint:** `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs`
- **Auth:** Uses a public API key (`jobboerse-jobsuche`) documented in their official developer portal
- **Docs:** [https://jobsuche.api.bund.dev/](https://jobsuche.api.bund.dev/)
- **Cost:** Free, no registration required

### 🌍 Adzuna
- **Endpoint:** `https://api.adzuna.com/v1/api/jobs/de/search/1`
- **Auth:** `app_id` + `app_key` query params (set in `.env`)
- **Docs:** [https://api.adzuna.com/](https://api.adzuna.com/)
- **Cost:** Free tier — 250 requests/hour

---

## 📚 Language Planner — Storage

Plans are saved to `localStorage` using the key pattern `zentry:lang:<language>`. Each language has its own independent plan so you can track multiple languages simultaneously. Data persists across page reloads and browser sessions.
