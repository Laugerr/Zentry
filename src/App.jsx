import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import JobHunter from './pages/JobHunter'
import LanguagePlanner from './pages/LanguagePlanner'
import NewsTracker from './pages/NewsTracker'
import CVBuilder from './pages/CVBuilder'
import LiveRadio from './pages/LiveRadio'
import FootballToday from './pages/FootballToday'

// App uses HashRouter so GitHub Pages works without server-side routing.
// To add a new tool: import it here and add a <Route> + a nav entry in Layout.jsx.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/news" replace />} />
          <Route path="news" element={<NewsTracker />} />
          <Route path="jobs" element={<JobHunter />} />
          <Route path="language" element={<LanguagePlanner />} />
          <Route path="cv" element={<CVBuilder />} />
          <Route path="radio" element={<LiveRadio />} />
          <Route path="football" element={<FootballToday />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
