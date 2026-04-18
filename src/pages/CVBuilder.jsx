import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Plus, Trash2, ChevronDown, Download, RotateCcw, Upload, Share2, Link2 as LinkedinIcon,
  User, Briefcase, GraduationCap, Star, Globe, Award, FileText, Camera, Code, Mail,
  ZoomIn, ZoomOut, X, Check, FileJson,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native']
const ZOOM_STEPS  = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0]

const THEMES = {
  modern: {
    layout: 'standard', label: 'Modern',
    accent: '#7c3aed', accentSub: '#a78bfa',
    headerLine: '2.5px solid #7c3aed',
    sectionColor: '#5b21b6', sectionBorder: '1.5px solid #ede9fe',
    tagBg: '#f5f3ff', tagColor: '#6d28d9', tagBorder: '1px solid #ede9fe',
    photoRadius: '50%', nameColor: '#1e1b4b', titleColor: '#7c3aed',
    langLevelColor: '#7c3aed',
    fontFamily: "'Arial', 'Calibri', sans-serif",
  },
  minimal: {
    layout: 'standard', label: 'Minimal',
    accent: '#111827', accentSub: '#374151',
    headerLine: '2px solid #111827',
    sectionColor: '#111827', sectionBorder: '1px solid #d1d5db',
    tagBg: '#f3f4f6', tagColor: '#374151', tagBorder: '1px solid #d1d5db',
    photoRadius: '4px', nameColor: '#111827', titleColor: '#374151',
    langLevelColor: '#111827',
    fontFamily: "'Arial', 'Calibri', sans-serif",
  },
  classic: {
    layout: 'standard', label: 'Classic',
    accent: '#0f172a', accentSub: '#334155',
    headerLine: '3px double #0f172a',
    sectionColor: '#0f172a', sectionBorder: '1px solid #0f172a',
    tagBg: 'transparent', tagColor: '#0f172a', tagBorder: '1px solid #94a3b8',
    photoRadius: '2px', nameColor: '#0f172a', titleColor: '#475569',
    langLevelColor: '#0f172a',
    fontFamily: "'Georgia', 'Times New Roman', serif",
  },
  compact: {
    layout: 'compact', label: 'Compact',
    accent: '#0891b2', accentSub: '#06b6d4',
    headerLine: '1.5px solid #0891b2',
    sectionColor: '#155e75', sectionBorder: '1px solid #cffafe',
    tagBg: '#ecfeff', tagColor: '#0e7490', tagBorder: '1px solid #a5f3fc',
    photoRadius: '4px', nameColor: '#083344', titleColor: '#0891b2',
    langLevelColor: '#0891b2',
    fontFamily: "'Arial', 'Helvetica', sans-serif",
  },
  sidebar: {
    layout: 'sidebar', label: 'Sidebar',
    accent: '#ea580c', accentSub: '#fb923c',
    headerLine: 'none',
    sectionColor: '#7c2d12', sectionBorder: '1px solid #fed7aa',
    tagBg: '#fff7ed', tagColor: '#9a3412', tagBorder: '1px solid #fed7aa',
    photoRadius: '50%', nameColor: '#1f2937', titleColor: '#ea580c',
    langLevelColor: '#ea580c',
    sidebarBg: '#f8fafc', sidebarWidth: '70mm',
    fontFamily: "'Arial', 'Calibri', sans-serif",
  },
}

function uid() { return Math.random().toString(36).slice(2, 9) }

function defaultCV() {
  return {
    personal: {
      firstName: '', lastName: '', title: '',
      email: '', phone: '', city: '', country: 'Germany',
      birthDate: '', nationality: '', photo: null,
      linkedin: '', github: '', website: '',
    },
    summary: '',
    experience: [],
    projects: [],
    education: [],
    skills: [],
    languages: [],
    certifications: [],
    interests: '',
  }
}

function loadCV() {
  try {
    const raw = localStorage.getItem('zentry-cv')
    if (raw) return { ...defaultCV(), ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return defaultCV()
}

function defaultCover() {
  return {
    recipient: { name: '', title: '', company: '', address: '' },
    sender: { address: '', email: '', phone: '' },
    date: new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }),
    subject: 'Application for the position of …',
    greeting: 'Dear Hiring Manager,',
    paragraphs: [
      'I am writing to express my strong interest in the role at your company. With my background and skills, I am confident I can contribute to your team.',
      'In my previous roles, I have developed expertise in … which directly aligns with your requirements. I am particularly drawn to your organisation because …',
      'I would welcome the opportunity to discuss how I can contribute to your team. Thank you for your consideration.',
    ],
    closing: 'Yours sincerely,',
  }
}
function loadCover() {
  try {
    const raw = localStorage.getItem('zentry-cover')
    if (raw) return { ...defaultCover(), ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return defaultCover()
}

// ─── Share link codec ─────────────────────────────────────────────────────────
// Encodes as "z:<urlsafe-base64>" (deflated) when the browser supports
// CompressionStream, else "r:<base64>" raw. Photos are stripped to keep URLs
// manageable — a 200KB dataURL would blow past URL length limits.
async function encodeShare(data) {
  const clone = { ...data, personal: { ...data.personal, photo: null } }
  const json = JSON.stringify(clone)
  if (typeof CompressionStream === 'function') {
    try {
      const cs = new CompressionStream('deflate-raw')
      const stream = new Blob([json]).stream().pipeThrough(cs)
      const buf = await new Response(stream).arrayBuffer()
      let bin = ''; const u = new Uint8Array(buf)
      for (let i = 0; i < u.length; i++) bin += String.fromCharCode(u[i])
      const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      return 'z:' + b64
    } catch { /* fall through to raw */ }
  }
  return 'r:' + btoa(unescape(encodeURIComponent(json)))
}
async function decodeShare(s) {
  if (!s) return null
  try {
    if (s.startsWith('r:')) {
      return JSON.parse(decodeURIComponent(escape(atob(s.slice(2)))))
    }
    if (s.startsWith('z:')) {
      let b64 = s.slice(2).replace(/-/g, '+').replace(/_/g, '/')
      while (b64.length % 4) b64 += '='
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const ds = new DecompressionStream('deflate-raw')
      const stream = new Blob([bytes]).stream().pipeThrough(ds)
      const json = await new Response(stream).text()
      return JSON.parse(json)
    }
  } catch { return null }
  return null
}

// ─── Import parsers ───────────────────────────────────────────────────────────
// Sniffs a plain JS object: native Zentry shape vs JSON Resume (jsonresume.org).
function importJSON(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('Not a JSON object')
  // Native shape — we wrote it
  if (obj.personal && (obj.experience || obj.education)) {
    return { ...defaultCV(), ...obj, personal: { ...defaultCV().personal, ...obj.personal } }
  }
  // JSON Resume shape — has `basics` + `work`
  if (obj.basics) {
    const b = obj.basics
    const [firstName, ...rest] = (b.name ?? '').split(' ')
    const lastName = rest.join(' ')
    const cv = defaultCV()
    cv.personal = {
      ...cv.personal,
      firstName: firstName ?? '', lastName,
      title:    b.label ?? '',
      email:    b.email ?? '',
      phone:    b.phone ?? '',
      city:     b.location?.city ?? '',
      country:  b.location?.countryCode ?? b.location?.region ?? cv.personal.country,
      website:  b.url ?? '',
      linkedin: (b.profiles ?? []).find((p) => /linkedin/i.test(p.network))?.url ?? '',
      github:   (b.profiles ?? []).find((p) => /github/i.test(p.network))?.url ?? '',
    }
    cv.summary     = b.summary ?? ''
    cv.experience  = (obj.work ?? []).map((w) => ({
      id: uid(), company: w.name ?? w.company ?? '', role: w.position ?? '',
      location: w.location ?? '', startDate: w.startDate ?? '', endDate: w.endDate ?? '',
      current: !w.endDate, bullets: (w.highlights?.length ? w.highlights : [w.summary]).filter(Boolean),
    }))
    cv.education   = (obj.education ?? []).map((e) => ({
      id: uid(), institution: e.institution ?? '', degree: e.studyType ?? '',
      field: e.area ?? '', startDate: e.startDate ?? '', endDate: e.endDate ?? '', grade: e.score ?? '',
    }))
    cv.projects    = (obj.projects ?? []).map((p) => ({
      id: uid(), name: p.name ?? '', url: p.url ?? '', role: p.roles?.[0] ?? '',
      description: p.description ?? '', tech: p.keywords ?? [],
    }))
    cv.skills      = (obj.skills ?? []).map((s) => ({ id: uid(), category: s.name ?? '', items: s.keywords ?? [] }))
    cv.languages   = (obj.languages ?? []).map((l) => ({ id: uid(), language: l.language ?? '', level: l.fluency ?? 'B2' }))
    cv.certifications = (obj.certificates ?? []).map((c) => ({ id: uid(), name: c.name ?? '', issuer: c.issuer ?? '', date: c.date ?? '' }))
    cv.interests   = (obj.interests ?? []).map((i) => i.name).filter(Boolean).join(', ')
    return cv
  }
  throw new Error('Unrecognised JSON shape (expected native or JSON Resume)')
}

// Tiny CSV parser — handles quoted fields with commas and escaped quotes.
function parseCSV(text) {
  const rows = []
  let row = [], cell = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') inQuotes = false
      else cell += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { row.push(cell); cell = '' }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
      else if (c === '\r') { /* skip */ }
      else cell += c
    }
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.length && r.some((x) => x !== ''))
}
function csvToObjects(text) {
  const rows = parseCSV(text)
  if (rows.length < 2) return []
  const headers = rows[0].map((h) => h.trim())
  return rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])))
}
// Merges LinkedIn data-export CSV files (Profile.csv, Positions.csv, Education.csv,
// Skills.csv, Languages.csv, Certifications.csv) into a CV. Any file can be missing.
function importLinkedInCSVs(fileContents, base = defaultCV()) {
  const cv = { ...base, personal: { ...base.personal } }
  for (const { name, text } of fileContents) {
    const rows = csvToObjects(text)
    const lower = name.toLowerCase()
    if (lower.includes('profile') && rows[0]) {
      const r = rows[0]
      cv.personal.firstName = r['First Name'] ?? cv.personal.firstName
      cv.personal.lastName  = r['Last Name']  ?? cv.personal.lastName
      cv.personal.title     = r['Headline']   ?? cv.personal.title
      cv.summary            = r['Summary']    ?? cv.summary
    } else if (lower.includes('email')) {
      if (rows[0]?.['Email Address']) cv.personal.email = rows[0]['Email Address']
    } else if (lower.includes('phone')) {
      if (rows[0]?.['Number']) cv.personal.phone = rows[0]['Number']
    } else if (lower.includes('position')) {
      cv.experience = rows.map((r) => ({
        id: uid(),
        company: r['Company Name'] ?? '',
        role:    r['Title'] ?? '',
        location: r['Location'] ?? '',
        startDate: r['Started On'] ?? '',
        endDate:   r['Finished On'] ?? '',
        current: !r['Finished On'],
        bullets: (r['Description'] ?? '').split(/\n+/).map((s) => s.trim()).filter(Boolean),
      }))
    } else if (lower.includes('education')) {
      cv.education = rows.map((r) => ({
        id: uid(),
        institution: r['School Name'] ?? '',
        degree:      r['Degree Name'] ?? '',
        field:       r['Notes'] ?? '',
        startDate:   r['Start Date'] ?? '',
        endDate:     r['End Date'] ?? '',
        grade:       '',
      }))
    } else if (lower.includes('skill')) {
      const items = rows.map((r) => r['Name']).filter(Boolean)
      if (items.length) cv.skills = [{ id: uid(), category: 'Skills', items }]
    } else if (lower.includes('language')) {
      cv.languages = rows.map((r) => ({ id: uid(), language: r['Name'] ?? '', level: (r['Proficiency'] ?? 'B2').replace(/.*\((.)\).*/, '$1') || 'B2' }))
    } else if (lower.includes('certification')) {
      cv.certifications = rows.map((r) => ({
        id: uid(), name: r['Name'] ?? '', issuer: r['Authority'] ?? '', date: r['Started On'] ?? '',
      }))
    }
  }
  return cv
}

function scoreCV(cv) {
  let pts = 0
  const p = cv.personal
  if (p.firstName && p.lastName) pts += 10
  if (p.email)  pts += 8
  if (p.phone)  pts += 5
  if (p.title)  pts += 7
  if (p.photo)  pts += 5
  if (p.linkedin || p.github) pts += 5
  if (cv.summary?.trim().length > 30) pts += 10
  if (cv.experience.length > 0)       pts += 20
  if (cv.education.length > 0)        pts += 10
  if (cv.skills.length > 0)           pts += 8
  if (cv.languages.length > 0)        pts += 7
  if (cv.certifications.length > 0)   pts += 5
  return Math.min(100, pts)
}

// ─── CV Preview ───────────────────────────────────────────────────────────────

function PS({ title, t, children }) {   // Preview Section
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{
        fontSize: '8.5pt', fontWeight: 700, color: t.sectionColor,
        textTransform: 'uppercase', letterSpacing: '1.5px',
        borderBottom: t.sectionBorder, paddingBottom: '3px', marginBottom: '8px',
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function CVPreview({ cv, template }) {
  const t = THEMES[template] ?? THEMES.modern
  if (t.layout === 'sidebar') return <CVPreviewSidebar cv={cv} t={t} />
  return <CVPreviewStandard cv={cv} t={t} />
}

function CVPreviewStandard({ cv, t }) {
  const { personal: p, summary, experience, projects, education, skills, languages, certifications, interests } = cv
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name'
  const compact = t.layout === 'compact'
  const contactItems = [
    p.email    && `✉ ${p.email}`,
    p.phone    && `📞 ${p.phone}`,
    (p.city || p.country) && `📍 ${[p.city, p.country].filter(Boolean).join(', ')}`,
    p.linkedin && `in ${p.linkedin}`,
    p.github   && `⌨ ${p.github}`,
    p.website  && `🌐 ${p.website}`,
  ].filter(Boolean)

  return (
    <div id="cv-preview" style={{
      background: 'white', color: '#1f2937',
      fontFamily: t.fontFamily,
      fontSize: compact ? '9pt' : '10pt', lineHeight: compact ? 1.35 : 1.5,
      width: '210mm', minHeight: '297mm',
      padding: compact ? '12mm 16mm' : '16mm 20mm', boxSizing: 'border-box',
      boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', paddingBottom: '14px', borderBottom: t.headerLine }}>
        {p.photo && (
          <img src={p.photo} alt="" style={{ width: 82, height: 82, borderRadius: t.photoRadius, objectFit: 'cover', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '22pt', fontWeight: 800, color: t.nameColor, letterSpacing: '-0.5px', lineHeight: 1.1 }}>{fullName}</div>
          {p.title && <div style={{ fontSize: '11pt', color: t.titleColor, fontWeight: 600, marginTop: '3px' }}>{p.title}</div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: '14px', rowGap: '1px', marginTop: '5px', fontSize: '8.5pt', color: '#6b7280' }}>
            {contactItems.map((c, i) => <span key={i}>{c}</span>)}
          </div>
          {(p.birthDate || p.nationality) && (
            <div style={{ fontSize: '8pt', color: '#9ca3af', marginTop: '3px' }}>
              {[p.birthDate && `Born: ${p.birthDate}`, p.nationality && `Nationality: ${p.nationality}`].filter(Boolean).join('  ·  ')}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <PS title="Profile" t={t}>
          <p style={{ margin: 0, color: '#374151', fontSize: '9.5pt' }}>{summary}</p>
        </PS>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <PS title="Work Experience" t={t}>
          {experience.map((exp) => {
            const dates = [exp.startDate, exp.current ? 'Present' : exp.endDate].filter(Boolean).join(' – ')
            return (
              <div key={exp.id} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2px' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '10.5pt' }}>{exp.role || 'Role'}</span>
                    {exp.company  && <span style={{ color: '#6b7280', fontSize: '9.5pt' }}> · {exp.company}</span>}
                    {exp.location && <span style={{ color: '#9ca3af', fontSize: '9pt' }}> · {exp.location}</span>}
                  </div>
                  {dates && <span style={{ fontSize: '8.5pt', color: '#9ca3af', whiteSpace: 'nowrap' }}>{dates}</span>}
                </div>
                {exp.bullets?.filter(b => b.trim()).length > 0 && (
                  <ul style={{ margin: '3px 0 0', paddingLeft: '16px' }}>
                    {exp.bullets.filter(b => b.trim()).map((b, i) => (
                      <li key={i} style={{ fontSize: '9.5pt', color: '#4b5563', marginBottom: '2px' }}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </PS>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <PS title="Projects" t={t}>
          {projects.map((proj) => (
            <div key={proj.id} style={{ marginBottom: '9px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2px' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '10.5pt' }}>{proj.name || 'Project'}</span>
                  {proj.url && <span style={{ fontSize: '8.5pt', color: t.accent, marginLeft: '6px' }}>{proj.url}</span>}
                </div>
                {proj.role && <span style={{ fontSize: '8.5pt', color: '#9ca3af', whiteSpace: 'nowrap' }}>{proj.role}</span>}
              </div>
              {proj.description && <p style={{ margin: '2px 0 0', fontSize: '9.5pt', color: '#4b5563' }}>{proj.description}</p>}
              {proj.tech?.filter(t => t).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '3px' }}>
                  {proj.tech.filter(tk => tk).map((tk, i) => (
                    <span key={i} style={{ background: t.tagBg, color: t.tagColor, border: t.tagBorder, padding: '1px 6px', borderRadius: '3px', fontSize: '8pt' }}>{tk}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </PS>
      )}

      {/* Education */}
      {education.length > 0 && (
        <PS title="Education" t={t}>
          {education.map((edu) => {
            const dates = [edu.startDate, edu.endDate].filter(Boolean).join(' – ')
            return (
              <div key={edu.id} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2px' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '10.5pt' }}>{[edu.degree, edu.field].filter(Boolean).join(' in ') || 'Degree'}</span>
                    {edu.institution && <span style={{ color: '#6b7280', fontSize: '9.5pt' }}> · {edu.institution}</span>}
                    {edu.grade && <span style={{ color: '#9ca3af', fontSize: '9pt' }}> · Note: {edu.grade}</span>}
                  </div>
                  {dates && <span style={{ fontSize: '8.5pt', color: '#9ca3af', whiteSpace: 'nowrap' }}>{dates}</span>}
                </div>
              </div>
            )
          })}
        </PS>
      )}

      {/* Skills + Languages — two columns */}
      {(skills.length > 0 || languages.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: skills.length && languages.length ? '1.4fr 1fr' : '1fr', gap: '24px' }}>
          {skills.length > 0 && (
            <PS title="Skills" t={t}>
              {skills.map((g) => (
                <div key={g.id} style={{ marginBottom: '6px' }}>
                  {g.category && <div style={{ fontWeight: 600, fontSize: '9pt', color: '#374151', marginBottom: '3px' }}>{g.category}</div>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                    {g.items.map((item, i) => (
                      <span key={i} style={{ background: t.tagBg, color: t.tagColor, border: t.tagBorder, padding: '1px 7px', borderRadius: '3px', fontSize: '8.5pt' }}>{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </PS>
          )}
          {languages.length > 0 && (
            <PS title="Languages" t={t}>
              {languages.map((l) => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '9.5pt' }}>
                  <span style={{ color: '#374151' }}>{l.language || '—'}</span>
                  <span style={{ color: t.langLevelColor, fontWeight: 600 }}>{l.level}</span>
                </div>
              ))}
            </PS>
          )}
        </div>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <PS title="Certifications" t={t}>
          {certifications.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', flexWrap: 'wrap', gap: '2px' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '9.5pt' }}>{c.name || 'Certificate'}</span>
                {c.issuer && <span style={{ color: '#6b7280', fontSize: '9pt' }}> · {c.issuer}</span>}
              </div>
              {c.date && <span style={{ fontSize: '8.5pt', color: '#9ca3af', whiteSpace: 'nowrap' }}>{c.date}</span>}
            </div>
          ))}
        </PS>
      )}

      {/* Interests */}
      {interests && (
        <PS title="Interests" t={t}>
          <p style={{ margin: 0, color: '#4b5563', fontSize: '9.5pt' }}>{interests}</p>
        </PS>
      )}
    </div>
  )
}

// ─── Sidebar template — two-column layout ───────────────────────────────────
function CVPreviewSidebar({ cv, t }) {
  const { personal: p, summary, experience, projects, education, skills, languages, certifications } = cv
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name'
  const SideTitle = ({ children }) => (
    <div style={{ fontSize: '8.5pt', fontWeight: 700, color: t.accent, textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '14px', marginBottom: '6px' }}>{children}</div>
  )
  const MainTitle = ({ children }) => (
    <div style={{ fontSize: '9pt', fontWeight: 700, color: t.sectionColor, textTransform: 'uppercase', letterSpacing: '1.8px', paddingBottom: '3px', marginBottom: '8px', borderBottom: t.sectionBorder }}>{children}</div>
  )
  return (
    <div id="cv-preview" style={{
      background: 'white', color: '#1f2937', display: 'flex',
      fontFamily: t.fontFamily, fontSize: '10pt', lineHeight: 1.5,
      width: '210mm', minHeight: '297mm', boxSizing: 'border-box',
      boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
    }}>
      {/* Sidebar */}
      <div style={{ width: t.sidebarWidth, background: t.sidebarBg, padding: '18mm 10mm', boxSizing: 'border-box' }}>
        {p.photo && <img src={p.photo} alt="" style={{ width: 110, height: 110, borderRadius: t.photoRadius, objectFit: 'cover', display: 'block', margin: '0 auto 14px' }} />}
        <SideTitle>Contact</SideTitle>
        <div style={{ fontSize: '8.5pt', color: '#374151', display: 'grid', gap: 3 }}>
          {p.email && <span>✉ {p.email}</span>}
          {p.phone && <span>📞 {p.phone}</span>}
          {(p.city || p.country) && <span>📍 {[p.city, p.country].filter(Boolean).join(', ')}</span>}
          {p.linkedin && <span>in {p.linkedin}</span>}
          {p.github && <span>⌨ {p.github}</span>}
          {p.website && <span>🌐 {p.website}</span>}
        </div>
        {(p.birthDate || p.nationality) && <>
          <SideTitle>Details</SideTitle>
          <div style={{ fontSize: '8.5pt', color: '#374151', display: 'grid', gap: 3 }}>
            {p.birthDate && <span>Born: {p.birthDate}</span>}
            {p.nationality && <span>Nationality: {p.nationality}</span>}
          </div>
        </>}
        {skills.length > 0 && <>
          <SideTitle>Skills</SideTitle>
          <div style={{ display: 'grid', gap: 6 }}>
            {skills.map((g) => (
              <div key={g.id}>
                {g.category && <div style={{ fontSize: '8pt', fontWeight: 600, color: '#374151', marginBottom: 2 }}>{g.category}</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {g.items.map((item, i) => (
                    <span key={i} style={{ background: t.tagBg, color: t.tagColor, border: t.tagBorder, padding: '1px 6px', borderRadius: 3, fontSize: '8pt' }}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>}
        {languages.length > 0 && <>
          <SideTitle>Languages</SideTitle>
          {languages.map((l) => (
            <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', marginBottom: 3 }}>
              <span style={{ color: '#374151' }}>{l.language || '—'}</span>
              <span style={{ color: t.langLevelColor, fontWeight: 600 }}>{l.level}</span>
            </div>
          ))}
        </>}
        {certifications.length > 0 && <>
          <SideTitle>Certifications</SideTitle>
          {certifications.map((c) => (
            <div key={c.id} style={{ marginBottom: 5, fontSize: '8.5pt' }}>
              <div style={{ fontWeight: 600, color: '#374151' }}>{c.name || 'Certificate'}</div>
              <div style={{ color: '#9ca3af', fontSize: '8pt' }}>{[c.issuer, c.date].filter(Boolean).join(' · ')}</div>
            </div>
          ))}
        </>}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: '18mm 16mm', boxSizing: 'border-box', minWidth: 0 }}>
        <div style={{ fontSize: '24pt', fontWeight: 800, color: t.nameColor, letterSpacing: '-0.5px', lineHeight: 1.05 }}>{fullName}</div>
        {p.title && <div style={{ fontSize: '12pt', color: t.titleColor, fontWeight: 600, marginTop: 3, marginBottom: 14 }}>{p.title}</div>}
        {summary && <>
          <MainTitle>Profile</MainTitle>
          <p style={{ fontSize: '9.5pt', color: '#374151', marginBottom: 12 }}>{summary}</p>
        </>}
        {experience.length > 0 && <>
          <MainTitle>Work Experience</MainTitle>
          {experience.map((exp) => {
            const dates = [exp.startDate, exp.current ? 'Present' : exp.endDate].filter(Boolean).join(' – ')
            return (
              <div key={exp.id} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '10.5pt' }}>{exp.role || 'Role'}</span>
                    {exp.company && <span style={{ color: '#6b7280', fontSize: '9.5pt' }}> · {exp.company}</span>}
                  </div>
                  {dates && <span style={{ fontSize: '8.5pt', color: '#9ca3af' }}>{dates}</span>}
                </div>
                {exp.bullets?.filter((b) => b.trim()).length > 0 && (
                  <ul style={{ margin: '3px 0 0', paddingLeft: 16 }}>
                    {exp.bullets.filter((b) => b.trim()).map((b, i) => (
                      <li key={i} style={{ fontSize: '9.5pt', color: '#4b5563', marginBottom: 2 }}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </>}
        {projects.length > 0 && <>
          <MainTitle>Projects</MainTitle>
          {projects.map((pr) => (
            <div key={pr.id} style={{ marginBottom: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '10.5pt' }}>{pr.name || 'Project'}</span>
                {pr.role && <span style={{ fontSize: '8.5pt', color: '#9ca3af' }}>{pr.role}</span>}
              </div>
              {pr.description && <p style={{ margin: '2px 0 0', fontSize: '9.5pt', color: '#4b5563' }}>{pr.description}</p>}
              {pr.tech?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>
                  {pr.tech.map((tk, i) => (
                    <span key={i} style={{ background: t.tagBg, color: t.tagColor, border: t.tagBorder, padding: '1px 6px', borderRadius: 3, fontSize: '8pt' }}>{tk}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>}
        {education.length > 0 && <>
          <MainTitle>Education</MainTitle>
          {education.map((edu) => {
            const dates = [edu.startDate, edu.endDate].filter(Boolean).join(' – ')
            return (
              <div key={edu.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '10.5pt' }}>{[edu.degree, edu.field].filter(Boolean).join(' in ') || 'Degree'}</span>
                    {edu.institution && <span style={{ color: '#6b7280', fontSize: '9.5pt' }}> · {edu.institution}</span>}
                  </div>
                  {dates && <span style={{ fontSize: '8.5pt', color: '#9ca3af' }}>{dates}</span>}
                </div>
                {edu.grade && <div style={{ color: '#9ca3af', fontSize: '8.5pt' }}>Grade: {edu.grade}</div>}
              </div>
            )
          })}
        </>}
      </div>
    </div>
  )
}

// ─── Cover Letter Preview ─────────────────────────────────────────────────────
function CoverLetterPreview({ cover, cv, template }) {
  const t = THEMES[template] ?? THEMES.modern
  const p = cv.personal
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name'
  const senderContact = [p.email, p.phone, [p.city, p.country].filter(Boolean).join(', ')].filter(Boolean)
  return (
    <div id="cv-preview" style={{
      background: 'white', color: '#1f2937',
      fontFamily: t.fontFamily,
      fontSize: '11pt', lineHeight: 1.55,
      width: '210mm', minHeight: '297mm',
      padding: '25mm 25mm 30mm', boxSizing: 'border-box',
      boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Sender name + contact */}
      <div style={{ textAlign: 'right', paddingBottom: 14, borderBottom: t.headerLine === 'none' ? '1px solid #e5e7eb' : t.headerLine, marginBottom: 20 }}>
        <div style={{ fontSize: '18pt', fontWeight: 800, color: t.nameColor, letterSpacing: '-0.5px' }}>{fullName}</div>
        {p.title && <div style={{ fontSize: '10pt', color: t.titleColor, marginTop: 2 }}>{p.title}</div>}
        <div style={{ fontSize: '9pt', color: '#6b7280', marginTop: 5 }}>
          {senderContact.join('  ·  ')}
        </div>
      </div>

      {/* Recipient */}
      <div style={{ marginBottom: 20 }}>
        {cover.recipient?.name    && <div style={{ fontWeight: 600 }}>{cover.recipient.name}</div>}
        {cover.recipient?.title   && <div style={{ color: '#4b5563' }}>{cover.recipient.title}</div>}
        {cover.recipient?.company && <div>{cover.recipient.company}</div>}
        {cover.recipient?.address && <div style={{ color: '#6b7280', whiteSpace: 'pre-line' }}>{cover.recipient.address}</div>}
      </div>

      {/* Date */}
      <div style={{ textAlign: 'right', color: '#4b5563', marginBottom: 18 }}>{cover.date}</div>

      {/* Subject */}
      {cover.subject && <div style={{ fontWeight: 700, marginBottom: 14, color: t.sectionColor }}>{cover.subject}</div>}

      {/* Greeting */}
      <div style={{ marginBottom: 12 }}>{cover.greeting}</div>

      {/* Body */}
      <div style={{ flex: 1 }}>
        {(cover.paragraphs ?? []).filter((pg) => pg.trim()).map((pg, i) => (
          <p key={i} style={{ margin: '0 0 12px', textAlign: 'justify', color: '#374151' }}>{pg}</p>
        ))}
      </div>

      {/* Closing */}
      <div style={{ marginTop: 18 }}>
        <div>{cover.closing}</div>
        <div style={{ marginTop: 36, fontWeight: 600 }}>{fullName}</div>
      </div>
    </div>
  )
}

// ─── Form primitives ──────────────────────────────────────────────────────────

function FormSection({ title, icon: Icon, color = '#a78bfa', defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    // flex-shrink:0 prevents the section from being squished by the scroll container.
    // overflow must NOT be hidden — it was clipping expanded content and causing visual overlap.
    <div style={{ borderRadius: '10px', border: '1px solid var(--border)', borderLeft: `3px solid ${color}`, flexShrink: 0 }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.65rem 1rem', background: 'var(--bg-card)', border: 'none',
        borderRadius: open ? '10px 10px 0 0' : '10px',
        cursor: 'pointer', color: 'var(--text-primary)',
        fontFamily: "'Inter', sans-serif", fontSize: '0.83rem', fontWeight: 600,
      }}>
        <Icon size={13} style={{ color }} />
        <span style={{ flex: 1, textAlign: 'left' }}>{title}</span>
        <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid var(--border)', borderRadius: '0 0 10px 10px', display: 'flex', flexDirection: 'column', gap: '0.65rem', background: 'rgba(255,255,255,0.01)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      {label && <label style={{ fontSize: '0.67rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>}
      {children}
      {hint && <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{hint}</span>}
    </div>
  )
}

const iStyle = {
  background: 'var(--bg-primary)', border: '1px solid var(--border)',
  borderRadius: '6px', padding: '0.4rem 0.6rem',
  color: 'var(--text-primary)', fontSize: '0.81rem',
  fontFamily: "'Inter', sans-serif", width: '100%', boxSizing: 'border-box',
  outline: 'none',
}

function Inp({ value, onChange, placeholder, type = 'text', disabled }) {
  return <input type={type} value={value} disabled={disabled} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...iStyle, opacity: disabled ? 0.4 : 1 }} />
}

function Tarea({ value, onChange, placeholder, rows = 3 }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ ...iStyle, resize: 'vertical', lineHeight: 1.5 }} />
}

function Grid2({ children }) { return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.55rem' }}>{children}</div> }
function Grid3({ children }) { return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.55rem' }}>{children}</div> }

function EntryCard({ label, onRemove, children }) {
  return (
    <div style={{ padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <button onClick={onRemove} className="btn-ghost" style={{ padding: '0.2rem', color: '#f87171' }}><Trash2 size={12} /></button>
      </div>
      {children}
    </div>
  )
}

function AddBtn({ onClick, label }) {
  return (
    <button onClick={onClick} className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', alignSelf: 'flex-start' }}>
      <Plus size={12} /> {label}
    </button>
  )
}

// ─── Cover Letter form ────────────────────────────────────────────────────────
function CoverLetterForm({ cover, setCoverField, setCoverSub, addPara, updPara, delPara }) {
  return (
    <>
      <FormSection title="Recipient" icon={Mail} color="#60a5fa" defaultOpen>
        <Grid2>
          <Field label="Name"><Inp value={cover.recipient.name} onChange={(v) => setCoverSub('recipient', 'name', v)} placeholder="Jane Doe" /></Field>
          <Field label="Title"><Inp value={cover.recipient.title} onChange={(v) => setCoverSub('recipient', 'title', v)} placeholder="Hiring Manager" /></Field>
        </Grid2>
        <Field label="Company"><Inp value={cover.recipient.company} onChange={(v) => setCoverSub('recipient', 'company', v)} placeholder="Acme GmbH" /></Field>
        <Field label="Address"><Tarea value={cover.recipient.address} onChange={(v) => setCoverSub('recipient', 'address', v)} placeholder={'Musterstrasse 1\n10115 Berlin'} rows={2} /></Field>
      </FormSection>

      <FormSection title="Letter" icon={FileText} color="#a78bfa" defaultOpen>
        <Grid2>
          <Field label="Date"><Inp value={cover.date} onChange={(v) => setCoverField('date', v)} placeholder="17 April 2026" /></Field>
          <Field label="Subject"><Inp value={cover.subject} onChange={(v) => setCoverField('subject', v)} placeholder="Application for the position of …" /></Field>
        </Grid2>
        <Field label="Greeting"><Inp value={cover.greeting} onChange={(v) => setCoverField('greeting', v)} placeholder="Dear Hiring Manager," /></Field>

        <Field label="Body paragraphs">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {cover.paragraphs.map((pg, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.35rem', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace", marginTop: '0.4rem' }}>{String(i + 1).padStart(2, '0')}</span>
                <textarea value={pg} onChange={(e) => updPara(i, e.target.value)} placeholder="Write a paragraph…" rows={3}
                  style={{ ...iStyle, resize: 'vertical', lineHeight: 1.5 }} />
                {cover.paragraphs.length > 1 && (
                  <button onClick={() => delPara(i)} className="btn-ghost" style={{ padding: '0.22rem', color: '#f87171', flexShrink: 0, marginTop: '0.2rem' }}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            <AddBtn onClick={addPara} label="Add paragraph" />
          </div>
        </Field>

        <Field label="Closing"><Inp value={cover.closing} onChange={(v) => setCoverField('closing', v)} placeholder="Yours sincerely," /></Field>
      </FormSection>
    </>
  )
}

// ─── Import modal ─────────────────────────────────────────────────────────────
function ImportModal({ onClose, onImportJSON, onImportLinkedIn, onExportJSON, setToast }) {
  const jsonRef = useRef()
  const liRef   = useRef()

  function pickJSON(e) {
    const file = e.target.files[0]; if (!file) return
    const r = new FileReader()
    r.onload = (ev) => {
      try { onImportJSON(JSON.parse(ev.target.result)) }
      catch (err) { setToast({ msg: err?.message || 'Invalid JSON', kind: 'err' }) }
    }
    r.readAsText(file)
  }

  function pickLinkedIn(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    Promise.all(files.map((f) => f.text().then((text) => ({ name: f.name, text }))))
      .then((contents) => {
        try { onImportLinkedIn(contents) }
        catch (err) { setToast({ msg: err?.message || 'Import failed', kind: 'err' }) }
      })
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 300 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(520px, 92vw)', zIndex: 301,
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '1.25rem 1.35rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
          <h2 style={{ fontSize: '1rem', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)' }}>Import CV data</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '0.3rem', border: 'none' }}><X size={14} /></button>
        </div>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {/* JSON */}
          <div style={{ padding: '0.9rem', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <FileJson size={14} style={{ color: '#a78bfa' }} />
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>JSON file</span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
              Zentry&apos;s own export, or any <a href="https://jsonresume.org/schema" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-purple)' }}>JSON Resume</a> file.
            </p>
            <input ref={jsonRef} type="file" accept=".json,application/json" onChange={pickJSON} style={{ display: 'none' }} />
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button className="btn-ghost" onClick={() => jsonRef.current.click()} style={{ fontSize: '0.77rem' }}>Choose JSON file</button>
              <button className="btn-ghost" onClick={onExportJSON} style={{ fontSize: '0.77rem' }}>Download current as JSON</button>
            </div>
          </div>

          {/* LinkedIn */}
          <div style={{ padding: '0.9rem', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <LinkedinIcon size={14} style={{ color: '#38bdf8' }} />
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>LinkedIn data export</span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '0.6rem', lineHeight: 1.5 }}>
              On LinkedIn: <strong>Settings → Data privacy → Get a copy of your data</strong>. From the zip, select any of:
              <code style={{ background: 'var(--input-bg)', padding: '0 4px', borderRadius: 3, margin: '0 3px' }}>Profile.csv</code>
              <code style={{ background: 'var(--input-bg)', padding: '0 4px', borderRadius: 3, margin: '0 3px' }}>Positions.csv</code>
              <code style={{ background: 'var(--input-bg)', padding: '0 4px', borderRadius: 3, margin: '0 3px' }}>Education.csv</code>
              <code style={{ background: 'var(--input-bg)', padding: '0 4px', borderRadius: 3, margin: '0 3px' }}>Skills.csv</code>
              <code style={{ background: 'var(--input-bg)', padding: '0 4px', borderRadius: 3, margin: '0 3px' }}>Languages.csv</code>
              <code style={{ background: 'var(--input-bg)', padding: '0 4px', borderRadius: 3, margin: '0 3px' }}>Certifications.csv</code>.
            </p>
            <input ref={liRef} type="file" accept=".csv,text/csv" multiple onChange={pickLinkedIn} style={{ display: 'none' }} />
            <button className="btn-ghost" onClick={() => liRef.current.click()} style={{ fontSize: '0.77rem' }}>Choose LinkedIn CSVs</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CVBuilder() {
  const [cv, setCV]         = useState(loadCV)
  const [cover, setCover]   = useState(loadCover)
  const [docMode, setDocMode] = useState('cv')        // 'cv' | 'cover'
  const [mode, setMode]     = useState('split')       // 'split' | 'edit' | 'preview'
  const [template, setTpl]  = useState('modern')      // key of THEMES
  const [zoom, setZoom]     = useState(0.7)
  const [confirmReset, setConfirmReset] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [importOpen, setImportOpen] = useState(false)
  const [toast, setToast]   = useState(null)          // { msg, kind }
  const photoRef = useRef()
  const location = useLocation()
  const navigate = useNavigate()

  // Load shared CV from URL (?share=… in the HashRouter query) on mount.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const s = params.get('share')
    if (!s) return
    decodeShare(s).then((imported) => {
      if (imported) {
        setCV((prev) => ({ ...imported, personal: { ...imported.personal, photo: prev.personal.photo } }))
        setToast({ msg: 'Loaded shared CV', kind: 'ok' })
      }
    }).finally(() => {
      // Strip the share param so refreshes don't keep re-importing.
      navigate({ pathname: location.pathname, search: '' }, { replace: true })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // On mobile, 'split' collapses to 'edit'
  const effectiveMode = isMobile && mode === 'split' ? 'edit' : mode

  useEffect(() => {
    try { localStorage.setItem('zentry-cv', JSON.stringify(cv)) } catch { /* ignore */ }
  }, [cv])
  useEffect(() => {
    try { localStorage.setItem('zentry-cover', JSON.stringify(cover)) } catch { /* ignore */ }
  }, [cover])

  // — Cover letter helpers —
  const setCoverField = (k, v) => setCover((c) => ({ ...c, [k]: v }))
  const setCoverSub   = (group, k, v) => setCover((c) => ({ ...c, [group]: { ...c[group], [k]: v } }))
  const addCoverPara  = () => setCover((c) => ({ ...c, paragraphs: [...c.paragraphs, ''] }))
  const updCoverPara  = (i, v) => setCover((c) => ({ ...c, paragraphs: c.paragraphs.map((p, pi) => pi === i ? v : p) }))
  const delCoverPara  = (i) => setCover((c) => ({ ...c, paragraphs: c.paragraphs.filter((_, pi) => pi !== i) }))

  // — Share link —
  async function handleShare() {
    try {
      const s = await encodeShare(cv)
      const url = `${window.location.origin}${window.location.pathname}#/cv?share=${s}`
      if (url.length > 6000) {
        setToast({ msg: 'URL too long — try removing photo or trimming content', kind: 'warn' })
        return
      }
      await navigator.clipboard.writeText(url)
      setToast({ msg: 'Shareable link copied to clipboard', kind: 'ok' })
    } catch {
      setToast({ msg: 'Couldn\u2019t create share link', kind: 'err' })
    }
  }

  // — Export current state (downloads as a JSON file) —
  function handleExportJSON() {
    const blob = new Blob([JSON.stringify(cv, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${[cv.personal.firstName, cv.personal.lastName].filter(Boolean).join('-') || 'cv'}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function applyImport(imported) {
    setCV({ ...defaultCV(), ...imported, personal: { ...defaultCV().personal, ...imported.personal } })
    setImportOpen(false)
    setToast({ msg: 'Imported successfully', kind: 'ok' })
  }

  const setP   = (k, v) => setCV(p => ({ ...p, personal: { ...p.personal, [k]: v } }))
  const setTop = (k, v) => setCV(p => ({ ...p, [k]: v }))

  // — Experience —
  const addExp    = () => setCV(p => ({ ...p, experience: [...p.experience, { id: uid(), company: '', role: '', location: '', startDate: '', endDate: '', current: false, bullets: [''] }] }))
  const updExp    = (id, k, v) => setCV(p => ({ ...p, experience: p.experience.map(e => e.id === id ? { ...e, [k]: v } : e) }))
  const delExp    = (id) => setCV(p => ({ ...p, experience: p.experience.filter(e => e.id !== id) }))
  const addBullet = (id) => setCV(p => ({ ...p, experience: p.experience.map(e => e.id === id ? { ...e, bullets: [...e.bullets, ''] } : e) }))
  const updBullet = (id, i, v) => setCV(p => ({ ...p, experience: p.experience.map(e => e.id === id ? { ...e, bullets: e.bullets.map((b, bi) => bi === i ? v : b) } : e) }))
  const delBullet = (id, i) => setCV(p => ({ ...p, experience: p.experience.map(e => e.id === id ? { ...e, bullets: e.bullets.filter((_, bi) => bi !== i) } : e) }))

  // — Projects —
  const addProj  = () => setCV(p => ({ ...p, projects: [...p.projects, { id: uid(), name: '', url: '', role: '', description: '', tech: [] }] }))
  const updProj  = (id, k, v) => setCV(p => ({ ...p, projects: p.projects.map(x => x.id === id ? { ...x, [k]: v } : x) }))
  const delProj  = (id) => setCV(p => ({ ...p, projects: p.projects.filter(x => x.id !== id) }))

  // — Education —
  const addEdu  = () => setCV(p => ({ ...p, education: [...p.education, { id: uid(), institution: '', degree: '', field: '', startDate: '', endDate: '', grade: '' }] }))
  const updEdu  = (id, k, v) => setCV(p => ({ ...p, education: p.education.map(e => e.id === id ? { ...e, [k]: v } : e) }))
  const delEdu  = (id) => setCV(p => ({ ...p, education: p.education.filter(e => e.id !== id) }))

  // — Skills —
  const addSkill = () => setCV(p => ({ ...p, skills: [...p.skills, { id: uid(), category: '', items: [] }] }))
  const updSkill = (id, k, v) => setCV(p => ({ ...p, skills: p.skills.map(s => s.id === id ? { ...s, [k]: v } : s) }))
  const delSkill = (id) => setCV(p => ({ ...p, skills: p.skills.filter(s => s.id !== id) }))

  // — Languages —
  const addLang = () => setCV(p => ({ ...p, languages: [...p.languages, { id: uid(), language: '', level: 'B2' }] }))
  const updLang = (id, k, v) => setCV(p => ({ ...p, languages: p.languages.map(l => l.id === id ? { ...l, [k]: v } : l) }))
  const delLang = (id) => setCV(p => ({ ...p, languages: p.languages.filter(l => l.id !== id) }))

  // — Certifications —
  const addCert = () => setCV(p => ({ ...p, certifications: [...p.certifications, { id: uid(), name: '', issuer: '', date: '' }] }))
  const updCert = (id, k, v) => setCV(p => ({ ...p, certifications: p.certifications.map(c => c.id === id ? { ...c, [k]: v } : c) }))
  const delCert = (id) => setCV(p => ({ ...p, certifications: p.certifications.filter(c => c.id !== id) }))

  // Photo upload
  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setP('photo', ev.target.result)
    reader.readAsDataURL(file)
  }

  // Export PDF via new window print
  function handleExportPDF() {
    const el = document.getElementById('cv-preview')
    if (!el) return
    const kind = docMode === 'cover' ? 'Cover Letter' : 'CV'
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${kind} \u2013 ${cv.personal.firstName} ${cv.personal.lastName}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:white; }
@page { size:A4; margin:0; }
</style></head><body>${el.outerHTML}</body></html>`)
    win.document.close()
    setTimeout(() => { win.print() }, 350)
  }

  function handleReset() {
    if (!confirmReset) { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 3000); return }
    if (docMode === 'cover') {
      setCover(defaultCover())
      localStorage.removeItem('zentry-cover')
    } else {
      setCV(defaultCV())
      localStorage.removeItem('zentry-cv')
    }
    setConfirmReset(false)
  }

  const score = scoreCV(cv)
  const scoreColor = score >= 70 ? '#34d399' : score >= 40 ? '#fbbf24' : '#f87171'
  const p = cv.personal

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '100%', gap: '1rem', minHeight: isMobile ? 'auto' : 0 }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flexShrink: 0 }}>

        {/* Row 1: title + score + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.15rem' }}>
              <span className="gradient-text">CV Builder</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Auto-saved · PDF / JSON export · Shareable link</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
            {/* Completeness — CV mode only */}
            {docMode === 'cv' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <div style={{ width: 70, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${score}%`, background: scoreColor, borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
                <span style={{ fontSize: '0.72rem', color: scoreColor, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{score}%</span>
              </div>
            )}
            {/* Import */}
            <button onClick={() => setImportOpen(true)} className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}>
              <Upload size={12} /> Import
            </button>
            {/* Share */}
            <button onClick={handleShare} className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}>
              <Share2 size={12} /> Share
            </button>
            {/* Export PDF */}
            <button className="btn-primary" onClick={handleExportPDF} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
              <Download size={13} /> Export PDF
            </button>
          </div>
        </div>

        {/* Doc-mode tabs */}
        <div className="segmented" style={{ alignSelf: 'flex-start' }}>
          <button className={`segmented-option ${docMode === 'cv' ? 'active' : ''}`} onClick={() => setDocMode('cv')}>
            <FileText size={11} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} /> CV
          </button>
          <button className={`segmented-option ${docMode === 'cover' ? 'active' : ''}`} onClick={() => setDocMode('cover')}>
            <Mail size={11} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} /> Cover Letter
          </button>
        </div>

        {/* Row 2: mode + template + zoom + reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Mode */}
          <div className="segmented">
            {!isMobile && (
              <button className={`segmented-option ${mode === 'split' ? 'active' : ''}`} onClick={() => setMode('split')}>Split</button>
            )}
            <button className={`segmented-option ${effectiveMode === 'edit' ? 'active' : ''}`} onClick={() => setMode(isMobile ? 'edit' : 'split')}>Edit</button>
            <button className={`segmented-option ${effectiveMode === 'preview' ? 'active' : ''}`} onClick={() => setMode('preview')}>Preview</button>
          </div>

          <div style={{ width: 1, height: 18, background: 'var(--border)' }} />

          {/* Template */}
          <div className="segmented" style={{ flexWrap: 'wrap' }}>
            {Object.entries(THEMES).map(([key, cfg]) => (
              <button key={key} className={`segmented-option ${template === key ? 'active' : ''}`} onClick={() => setTpl(key)}>
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Zoom — desktop only */}
          {!isMobile && (
            <>
              <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <button className="btn-ghost" onClick={() => setZoom(z => Math.max(ZOOM_STEPS[0], ZOOM_STEPS[ZOOM_STEPS.indexOf(z) - 1] ?? z))} style={{ padding: '0.3rem' }}><ZoomOut size={13} /></button>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", minWidth: 32, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                <button className="btn-ghost" onClick={() => setZoom(z => Math.min(ZOOM_STEPS[ZOOM_STEPS.length - 1], ZOOM_STEPS[ZOOM_STEPS.indexOf(z) + 1] ?? z))} style={{ padding: '0.3rem' }}><ZoomIn size={13} /></button>
              </div>
            </>
          )}

          <div style={{ marginLeft: 'auto' }}>
            <button onClick={handleReset} className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: confirmReset ? '#f87171' : 'var(--text-muted)' }}>
              <RotateCcw size={12} /> {confirmReset ? 'Confirm reset' : 'Reset'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Body grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: effectiveMode === 'split' ? 'minmax(0, 400px) minmax(0, 1fr)' : '1fr',
        gap: '1.25rem',
        flex: 1,
        minHeight: 0,
        // Each grid child gets height = this container's height, enabling independent scroll
      }}>

        {/* ── Form panel ── */}
        {(effectiveMode === 'split' || effectiveMode === 'edit') && docMode === 'cover' && (
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingRight: '0.25rem', minWidth: 0, alignContent: 'flex-start' }}>
            <CoverLetterForm
              cover={cover} setCoverField={setCoverField} setCoverSub={setCoverSub}
              addPara={addCoverPara} updPara={updCoverPara} delPara={delCoverPara}
            />
          </div>
        )}

        {(effectiveMode === 'split' || effectiveMode === 'edit') && docMode === 'cv' && (
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingRight: '0.25rem', minWidth: 0, alignContent: 'flex-start' }}>

            <FormSection title="Personal Info" icon={User} color="#a78bfa" defaultOpen>
              {/* Photo row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <div onClick={() => photoRef.current.click()} style={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-primary)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
                  {p.photo ? <img src={p.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={18} style={{ color: 'var(--text-muted)' }} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <button className="btn-ghost" onClick={() => photoRef.current.click()} style={{ fontSize: '0.76rem', padding: '0.28rem 0.6rem', alignSelf: 'flex-start' }}>Upload photo</button>
                  {p.photo && <button className="btn-ghost" onClick={() => setP('photo', null)} style={{ fontSize: '0.76rem', padding: '0.28rem 0.6rem', color: '#f87171', alignSelf: 'flex-start' }}>Remove</button>}
                  <input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
                </div>
              </div>

              <Grid2>
                <Field label="First name"><Inp value={p.firstName} onChange={v => setP('firstName', v)} placeholder="Max" /></Field>
                <Field label="Last name"><Inp value={p.lastName} onChange={v => setP('lastName', v)} placeholder="Mustermann" /></Field>
              </Grid2>
              <Field label="Job title"><Inp value={p.title} onChange={v => setP('title', v)} placeholder="Senior Software Engineer" /></Field>
              <Grid2>
                <Field label="Email"><Inp value={p.email} onChange={v => setP('email', v)} placeholder="max@example.com" /></Field>
                <Field label="Phone"><Inp value={p.phone} onChange={v => setP('phone', v)} placeholder="+49 123 456789" /></Field>
              </Grid2>
              <Grid2>
                <Field label="City"><Inp value={p.city} onChange={v => setP('city', v)} placeholder="Berlin" /></Field>
                <Field label="Country"><Inp value={p.country} onChange={v => setP('country', v)} placeholder="Germany" /></Field>
              </Grid2>
              <Grid2>
                <Field label="Date of birth"><Inp value={p.birthDate} onChange={v => setP('birthDate', v)} placeholder="01.01.1990" /></Field>
                <Field label="Nationality"><Inp value={p.nationality} onChange={v => setP('nationality', v)} placeholder="German" /></Field>
              </Grid2>
              <Grid2>
                <Field label="LinkedIn"><Inp value={p.linkedin} onChange={v => setP('linkedin', v)} placeholder="linkedin.com/in/user" /></Field>
                <Field label="GitHub"><Inp value={p.github} onChange={v => setP('github', v)} placeholder="github.com/user" /></Field>
              </Grid2>
              <Field label="Website / Portfolio"><Inp value={p.website} onChange={v => setP('website', v)} placeholder="https://yoursite.com" /></Field>
            </FormSection>

            <FormSection title="Professional Summary" icon={FileText} color="#818cf8" defaultOpen>
              <Tarea value={cv.summary} onChange={v => setTop('summary', v)} placeholder="Brief professional summary highlighting your expertise, background, and career goals…" rows={4} />
            </FormSection>

            <FormSection title="Work Experience" icon={Briefcase} color="#34d399">
              {cv.experience.map((exp, idx) => (
                <EntryCard key={exp.id} label={`Position ${idx + 1}`} onRemove={() => delExp(exp.id)}>
                  <Grid2>
                    <Field label="Role"><Inp value={exp.role} onChange={v => updExp(exp.id, 'role', v)} placeholder="Software Engineer" /></Field>
                    <Field label="Company"><Inp value={exp.company} onChange={v => updExp(exp.id, 'company', v)} placeholder="Acme GmbH" /></Field>
                  </Grid2>
                  <Grid3>
                    <Field label="Location"><Inp value={exp.location} onChange={v => updExp(exp.id, 'location', v)} placeholder="Berlin" /></Field>
                    <Field label="Start"><Inp value={exp.startDate} onChange={v => updExp(exp.id, 'startDate', v)} placeholder="Jan 2022" /></Field>
                    <Field label="End"><Inp value={exp.endDate} onChange={v => updExp(exp.id, 'endDate', v)} placeholder="Present" disabled={exp.current} /></Field>
                  </Grid3>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={exp.current} onChange={e => updExp(exp.id, 'current', e.target.checked)} />
                    Currently working here
                  </label>
                  <Field label="Achievements / Responsibilities">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {exp.bullets.map((b, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>•</span>
                          <input value={b} onChange={e => updBullet(exp.id, i, e.target.value)} placeholder="Describe an achievement…" style={{ ...iStyle, background: 'var(--bg-secondary)' }} />
                          {exp.bullets.length > 1 && <button onClick={() => delBullet(exp.id, i)} className="btn-ghost" style={{ padding: '0.18rem', color: '#f87171', flexShrink: 0 }}><Trash2 size={11} /></button>}
                        </div>
                      ))}
                      <AddBtn onClick={() => addBullet(exp.id)} label="Add bullet" />
                    </div>
                  </Field>
                </EntryCard>
              ))}
              <AddBtn onClick={addExp} label="Add position" />
            </FormSection>

            <FormSection title="Projects" icon={Code} color="#38bdf8">
              {cv.projects.map((proj, idx) => (
                <EntryCard key={proj.id} label={`Project ${idx + 1}`} onRemove={() => delProj(proj.id)}>
                  <Grid2>
                    <Field label="Project name"><Inp value={proj.name} onChange={v => updProj(proj.id, 'name', v)} placeholder="My App" /></Field>
                    <Field label="Your role"><Inp value={proj.role} onChange={v => updProj(proj.id, 'role', v)} placeholder="Lead Developer" /></Field>
                  </Grid2>
                  <Field label="URL / Link"><Inp value={proj.url} onChange={v => updProj(proj.id, 'url', v)} placeholder="github.com/user/project" /></Field>
                  <Field label="Description"><Tarea value={proj.description} onChange={v => updProj(proj.id, 'description', v)} placeholder="What the project does and your contribution…" rows={2} /></Field>
                  <Field label="Tech stack" hint="Comma-separated">
                    <Inp value={proj.tech.join(', ')} onChange={v => updProj(proj.id, 'tech', v.split(',').map(s => s.trim()).filter(Boolean))} placeholder="React, Node.js, PostgreSQL, Docker…" />
                  </Field>
                </EntryCard>
              ))}
              <AddBtn onClick={addProj} label="Add project" />
            </FormSection>

            <FormSection title="Education" icon={GraduationCap} color="#fb923c">
              {cv.education.map((edu, idx) => (
                <EntryCard key={edu.id} label={`Entry ${idx + 1}`} onRemove={() => delEdu(edu.id)}>
                  <Field label="Institution"><Inp value={edu.institution} onChange={v => updEdu(edu.id, 'institution', v)} placeholder="TU Berlin" /></Field>
                  <Grid2>
                    <Field label="Degree"><Inp value={edu.degree} onChange={v => updEdu(edu.id, 'degree', v)} placeholder="B.Sc." /></Field>
                    <Field label="Field of study"><Inp value={edu.field} onChange={v => updEdu(edu.id, 'field', v)} placeholder="Computer Science" /></Field>
                  </Grid2>
                  <Grid3>
                    <Field label="Start"><Inp value={edu.startDate} onChange={v => updEdu(edu.id, 'startDate', v)} placeholder="Oct 2018" /></Field>
                    <Field label="End"><Inp value={edu.endDate} onChange={v => updEdu(edu.id, 'endDate', v)} placeholder="Sep 2022" /></Field>
                    <Field label="Grade (Note)"><Inp value={edu.grade} onChange={v => updEdu(edu.id, 'grade', v)} placeholder="1.8" /></Field>
                  </Grid3>
                </EntryCard>
              ))}
              <AddBtn onClick={addEdu} label="Add education" />
            </FormSection>

            <FormSection title="Skills" icon={Star} color="#facc15">
              {cv.skills.map((g) => (
                <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.6rem', background: 'var(--bg-primary)', borderRadius: '7px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <Inp value={g.category} onChange={v => updSkill(g.id, 'category', v)} placeholder="Category — e.g. Frontend, DevOps…" />
                    <button onClick={() => delSkill(g.id)} className="btn-ghost" style={{ padding: '0.25rem', color: '#f87171', flexShrink: 0 }}><Trash2 size={12} /></button>
                  </div>
                  <Field hint="Comma-separated">
                    <Inp value={g.items.join(', ')} onChange={v => updSkill(g.id, 'items', v.split(',').map(s => s.trim()).filter(Boolean))} placeholder="React, TypeScript, Node.js, Docker…" />
                  </Field>
                </div>
              ))}
              <AddBtn onClick={addSkill} label="Add skill group" />
            </FormSection>

            <FormSection title="Languages" icon={Globe} color="#c084fc">
              {cv.languages.map((l) => (
                <div key={l.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Inp value={l.language} onChange={v => updLang(l.id, 'language', v)} placeholder="German" />
                  <select value={l.level} onChange={e => updLang(l.id, 'level', e.target.value)} style={{ ...iStyle, width: 'auto', flexShrink: 0 }}>
                    {CEFR_LEVELS.map(lv => <option key={lv} value={lv}>{lv}</option>)}
                  </select>
                  <button onClick={() => delLang(l.id)} className="btn-ghost" style={{ padding: '0.25rem', color: '#f87171', flexShrink: 0 }}><Trash2 size={12} /></button>
                </div>
              ))}
              <AddBtn onClick={addLang} label="Add language" />
            </FormSection>

            <FormSection title="Certifications" icon={Award} color="#f472b6">
              {cv.certifications.map((c) => (
                <div key={c.id} style={{ display: 'flex', gap: '0.45rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <Inp value={c.name} onChange={v => updCert(c.id, 'name', v)} placeholder="AWS Solutions Architect" />
                    <Grid2>
                      <Inp value={c.issuer} onChange={v => updCert(c.id, 'issuer', v)} placeholder="Amazon Web Services" />
                      <Inp value={c.date} onChange={v => updCert(c.id, 'date', v)} placeholder="2024" />
                    </Grid2>
                  </div>
                  <button onClick={() => delCert(c.id)} className="btn-ghost" style={{ padding: '0.25rem', color: '#f87171', flexShrink: 0, marginTop: '0.15rem' }}><Trash2 size={12} /></button>
                </div>
              ))}
              <AddBtn onClick={addCert} label="Add certification" />
            </FormSection>

            <FormSection title="Interests" icon={Star} color="#94a3b8">
              <Tarea value={cv.interests} onChange={v => setTop('interests', v)} placeholder="Photography, hiking, open-source…" rows={2} />
            </FormSection>

          </div>
        )}

        {/* ── Preview panel ── */}
        {(effectiveMode === 'split' || effectiveMode === 'preview') && (
          <div style={{ overflowX: 'auto', overflowY: isMobile ? 'visible' : 'auto', background: 'rgba(0,0,0,0.18)', borderRadius: '12px', padding: isMobile ? '0.75rem' : '2rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minWidth: 0 }}>
            <div style={{ zoom: isMobile ? 0.45 : zoom, flexShrink: 0, transformOrigin: 'top center' }}>
              {docMode === 'cover'
                ? <CoverLetterPreview cover={cover} cv={cv} template={template} />
                : <CVPreview cv={cv} template={template} />}
            </div>
          </div>
        )}

      </div>

      {/* ── Import modal ── */}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImportJSON={(obj) => applyImport(importJSON(obj))}
          onImportLinkedIn={(files) => applyImport(importLinkedInCSVs(files, cv))}
          onExportJSON={handleExportJSON}
          setToast={setToast}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '1.25rem', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-card)', border: `1px solid ${toast.kind === 'err' ? '#f87171' : toast.kind === 'warn' ? '#fbbf24' : '#34d399'}`,
          borderRadius: 10, padding: '0.55rem 0.95rem', fontSize: '0.82rem',
          color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)', zIndex: 200,
        }}>
          <Check size={13} style={{ color: toast.kind === 'err' ? '#f87171' : toast.kind === 'warn' ? '#fbbf24' : '#34d399' }} />
          {toast.msg}
        </div>
      )}
    </div>
  )
}
