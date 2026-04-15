import { useState, useEffect, useRef } from 'react'
import {
  Plus, Trash2, ChevronDown, Download, RotateCcw,
  User, Briefcase, GraduationCap, Star, Globe, Award, FileText, Camera, Code,
  ZoomIn, ZoomOut,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native']
const ZOOM_STEPS  = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0]

const THEMES = {
  modern: {
    accent: '#7c3aed', accentSub: '#a78bfa',
    headerLine: '2.5px solid #7c3aed',
    sectionColor: '#5b21b6', sectionBorder: '1.5px solid #ede9fe',
    tagBg: '#f5f3ff', tagColor: '#6d28d9', tagBorder: '1px solid #ede9fe',
    photoRadius: '50%', nameColor: '#1e1b4b', titleColor: '#7c3aed',
    langLevelColor: '#7c3aed',
  },
  minimal: {
    accent: '#111827', accentSub: '#374151',
    headerLine: '2px solid #111827',
    sectionColor: '#111827', sectionBorder: '1px solid #d1d5db',
    tagBg: '#f3f4f6', tagColor: '#374151', tagBorder: '1px solid #d1d5db',
    photoRadius: '4px', nameColor: '#111827', titleColor: '#374151',
    langLevelColor: '#111827',
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
  } catch {}
  return defaultCV()
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
  const { personal: p, summary, experience, projects, education, skills, languages, certifications, interests } = cv
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name'
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
      fontFamily: "'Arial', 'Calibri', sans-serif",
      fontSize: '10pt', lineHeight: 1.5,
      width: '210mm', minHeight: '297mm',
      padding: '16mm 20mm', boxSizing: 'border-box',
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

// ─── Form primitives ──────────────────────────────────────────────────────────

function FormSection({ title, icon: Icon, color = '#a78bfa', defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)', borderLeft: `3px solid ${color}` }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.65rem 1rem', background: 'var(--bg-card)', border: 'none',
        cursor: 'pointer', color: 'var(--text-primary)',
        fontFamily: "'Inter', sans-serif", fontSize: '0.83rem', fontWeight: 600,
      }}>
        <Icon size={13} style={{ color }} />
        <span style={{ flex: 1, textAlign: 'left' }}>{title}</span>
        <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.65rem', background: 'rgba(255,255,255,0.01)' }}>
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

function Grid2({ children }) { return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>{children}</div> }
function Grid3({ children }) { return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.55rem' }}>{children}</div> }

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

// ─── Main component ───────────────────────────────────────────────────────────

export default function CVBuilder() {
  const [cv, setCV]         = useState(loadCV)
  const [mode, setMode]     = useState('split')       // 'split' | 'edit' | 'preview'
  const [template, setTpl]  = useState('modern')      // 'modern' | 'minimal'
  const [zoom, setZoom]     = useState(0.7)
  const [confirmReset, setConfirmReset] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const photoRef = useRef()

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // On mobile, 'split' collapses to 'edit'
  const effectiveMode = isMobile && mode === 'split' ? 'edit' : mode

  useEffect(() => {
    try { localStorage.setItem('zentry-cv', JSON.stringify(cv)) } catch {}
  }, [cv])

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
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>CV – ${cv.personal.firstName} ${cv.personal.lastName}</title>
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
    setCV(defaultCV())
    localStorage.removeItem('zentry-cv')
    setConfirmReset(false)
  }

  const score = scoreCV(cv)
  const scoreColor = score >= 70 ? '#34d399' : score >= 40 ? '#fbbf24' : '#f87171'
  const p = cv.personal

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', minHeight: 0 }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.15rem' }}>
            <span className="gradient-text">CV Builder</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Auto-saved locally · Export to PDF</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Completeness */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <div style={{ width: 70, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${score}%`, background: scoreColor, borderRadius: 3, transition: 'width 0.4s' }} />
            </div>
            <span style={{ fontSize: '0.72rem', color: scoreColor, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{score}%</span>
          </div>

          {/* Mode */}
          <div className="segmented">
            {!isMobile && (
              <button className={`segmented-option ${mode === 'split' ? 'active' : ''}`} onClick={() => setMode('split')}>Edit + Preview</button>
            )}
            <button className={`segmented-option ${effectiveMode === 'edit' ? 'active' : ''}`} onClick={() => setMode(isMobile ? 'edit' : 'split')}>Edit</button>
            <button className={`segmented-option ${effectiveMode === 'preview' ? 'active' : ''}`} onClick={() => setMode('preview')}>Preview</button>
          </div>

          {/* Template */}
          <div className="segmented">
            <button className={`segmented-option ${template === 'modern' ? 'active' : ''}`} onClick={() => setTpl('modern')}>Modern</button>
            <button className={`segmented-option ${template === 'minimal' ? 'active' : ''}`} onClick={() => setTpl('minimal')}>Minimal</button>
          </div>

          {/* Zoom — desktop only */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <button className="btn-ghost" onClick={() => setZoom(z => Math.max(ZOOM_STEPS[0], ZOOM_STEPS[ZOOM_STEPS.indexOf(z) - 1] ?? z))} style={{ padding: '0.3rem' }}><ZoomOut size={13} /></button>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", minWidth: 32, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
              <button className="btn-ghost" onClick={() => setZoom(z => Math.min(ZOOM_STEPS[ZOOM_STEPS.length - 1], ZOOM_STEPS[ZOOM_STEPS.indexOf(z) + 1] ?? z))} style={{ padding: '0.3rem' }}><ZoomIn size={13} /></button>
            </div>
          )}

          {/* Reset */}
          <button onClick={handleReset} className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: confirmReset ? '#f87171' : 'var(--text-muted)' }}>
            <RotateCcw size={12} /> {confirmReset ? 'Click again to confirm' : 'Reset'}
          </button>

          {/* Export */}
          <button className="btn-primary" onClick={handleExportPDF} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
            <Download size={13} /> Export PDF
          </button>
        </div>
      </div>

      {/* ── Body grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: effectiveMode === 'split' ? '400px 1fr' : '1fr',
        gap: '1.25rem',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}>

        {/* ── Form panel ── */}
        {(effectiveMode === 'split' || effectiveMode === 'edit') && (
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingRight: '0.3rem' }}>

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
          <div style={{ overflowY: 'auto', overflowX: 'auto', background: 'rgba(0,0,0,0.18)', borderRadius: '12px', padding: isMobile ? '1rem' : '2rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div style={{ zoom: isMobile ? 0.5 : zoom, flexShrink: 0 }}>
              <CVPreview cv={cv} template={template} />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
