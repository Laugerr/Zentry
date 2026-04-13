import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import JobHunter from './pages/JobHunter'
import LanguagePlanner from './pages/LanguagePlanner'
import NewsTracker from './pages/NewsTracker'

// App uses HashRouter so GitHub Pages works without server-side routing.
// To add a new tool: import it here and add a <Route> + a nav entry in Layout.jsx.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/jobs" replace />} />
          <Route path="jobs" element={<JobHunter />} />
          <Route path="language" element={<LanguagePlanner />} />
          <Route path="news" element={<NewsTracker />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
