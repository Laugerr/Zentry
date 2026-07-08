import { useState } from 'react'
import { Download, Share, PlusSquare, Check, X, WifiOff, Zap } from 'lucide-react'
import { Button, IconButton, useToast } from '../components/ui'
import { Logo } from '../components/Logo'
import { useInstall, promptInstall, shouldOfferBanner, dismissBanner } from './install'
import './install.css'

function IOSSteps() {
  return (
    <ol className="install-steps">
      <li><span className="install-step-n">1</span>Tap <Share size={15} aria-label="Share" className="install-inline-icon" /> <b>Share</b> in Safari’s toolbar</li>
      <li><span className="install-step-n">2</span>Choose <PlusSquare size={15} aria-hidden="true" className="install-inline-icon" /> <b>Add to Home Screen</b></li>
      <li><span className="install-step-n">3</span>Tap <b>Add</b> — Zentry opens like an app</li>
    </ol>
  )
}

// Settings → "Install app"
export function InstallSection() {
  const { mode } = useInstall()
  const toast = useToast()
  const install = async () => {
    const outcome = await promptInstall()
    if (outcome === 'accepted') toast('Installing Zentry…', { tone: 'success' })
  }

  return (
    <div className="install-section">
      <div className="install-perks">
        <span><Zap size={14} aria-hidden="true" /> Opens instantly, full-screen</span>
        <span><WifiOff size={14} aria-hidden="true" /> Works offline with your saved data</span>
      </div>
      {mode === 'installed' && <div className="install-done"><Check size={16} aria-hidden="true" /> Zentry is installed on this device.</div>}
      {mode === 'prompt' && <Button variant="primary" icon={Download} onClick={install}>Install Zentry</Button>}
      {mode === 'ios' && <IOSSteps />}
      {mode === 'unsupported' && (
        <p className="settings-row-hint">
          This browser can’t install apps. Open Zentry in Chrome, Edge or Safari (on iPhone/iPad) to add it to your home screen or dock.
        </p>
      )}
    </div>
  )
}

// One gentle banner from the second visit on; "Not now" hides it for good.
export function InstallBanner() {
  const { mode } = useInstall()
  const [open, setOpen] = useState(() => shouldOfferBanner())
  const [iosOpen, setIosOpen] = useState(false)
  if (!open || (mode !== 'prompt' && mode !== 'ios')) return null

  const close = () => { dismissBanner(); setOpen(false) }
  const install = async () => {
    if (mode === 'ios') { setIosOpen(true); return }
    await promptInstall()
    close()
  }

  return (
    <div className="install-banner" role="dialog" aria-label="Install Zentry">
      <div className="install-banner-row">
        <Logo size={40} />
        <div className="install-banner-text">
          <div className="install-banner-title">Install Zentry</div>
          <div className="install-banner-sub">Open it like an app — fast, full-screen and offline.</div>
        </div>
        <IconButton icon={X} label="Not now" size="sm" onClick={close} />
      </div>
      {iosOpen ? <IOSSteps /> : (
        <div className="install-banner-actions">
          <Button variant="ghost" size="sm" onClick={close}>Not now</Button>
          <Button variant="primary" size="sm" icon={mode === 'ios' ? Share : Download} onClick={install}>
            {mode === 'ios' ? 'Show me how' : 'Install'}
          </Button>
        </div>
      )}
    </div>
  )
}
