// Empty-state illustrations — 160×120 SVG markup, bento style. Theme-aware via
// CSS vars (--bg-card, --surface-2, --border, --border-strong, --text-muted,
// --live and the --tool-* colours), so one drawing works in light and dark.
// Rendered by <Illustration name="…" /> (src/components/Illustration.jsx).
const T = (c, pct) => `color-mix(in srgb, ${c} ${pct}%, var(--bg-card))`

export const ILLUSTRATIONS = {
  // News — no bookmarks: two tilted article cards + a blue ribbon
  bookmarks: `
<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="80" cy="108" rx="52" ry="6" fill="var(--border)" opacity=".6"/>
  <g transform="rotate(-8 64 60)">
    <rect x="30" y="24" width="64" height="74" rx="14" fill="var(--surface-2)" stroke="var(--border-strong)" stroke-width="2"/>
    <rect x="40" y="36" width="44" height="22" rx="7" fill="${T('var(--tool-news)', 22)}"/>
    <rect x="40" y="66" width="40" height="5" rx="2.5" fill="var(--border-strong)"/>
    <rect x="40" y="77" width="28" height="5" rx="2.5" fill="var(--border-strong)"/>
  </g>
  <g transform="rotate(6 96 58)">
    <rect x="66" y="18" width="64" height="78" rx="14" fill="var(--bg-card)" stroke="var(--border-strong)" stroke-width="2"/>
    <rect x="76" y="30" width="44" height="24" rx="7" fill="${T('var(--tool-news)', 35)}"/>
    <circle cx="110" cy="38" r="5" fill="var(--bg-card)" opacity=".8"/>
    <rect x="76" y="62" width="40" height="5" rx="2.5" fill="var(--border-strong)"/>
    <rect x="76" y="73" width="30" height="5" rx="2.5" fill="var(--border-strong)"/>
    <path d="M108 6h16v26l-8-6-8 6z" fill="var(--tool-news)"/>
  </g>
  <path d="M28 20l2.5 5.5L36 28l-5.5 2.5L28 36l-2.5-5.5L20 28l5.5-2.5z" fill="var(--tool-news)" opacity=".55"/>
</svg>`,

  // Football — no matches: a pitch tile, a resting ball and a moon
  matches: `
<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="80" cy="108" rx="56" ry="6" fill="var(--border)" opacity=".6"/>
  <rect x="22" y="30" width="116" height="72" rx="16" fill="${T('var(--tool-football)', 18)}" stroke="${T('var(--tool-football)', 45)}" stroke-width="2"/>
  <path d="M80 30v72" stroke="${T('var(--tool-football)', 45)}" stroke-width="2"/>
  <circle cx="80" cy="66" r="14" stroke="${T('var(--tool-football)', 45)}" stroke-width="2"/>
  <rect x="22" y="50" width="16" height="32" rx="4" stroke="${T('var(--tool-football)', 45)}" stroke-width="2"/>
  <rect x="122" y="50" width="16" height="32" rx="4" stroke="${T('var(--tool-football)', 45)}" stroke-width="2"/>
  <circle cx="104" cy="84" r="14" fill="var(--bg-card)" stroke="var(--border-strong)" stroke-width="2"/>
  <path d="M104 77l6 4.5-2.3 7h-7.4l-2.3-7z" fill="var(--text-muted)"/>
  <path d="M104 70v7M110 81.5l7.5-2M107.7 88.5l4.5 6M100.3 88.5l-4.5 6M98 81.5l-7.5-2" stroke="var(--border-strong)" stroke-width="1.6"/>
  <path d="M132 10a12 12 0 1 0 10 18 10 10 0 0 1-10-18z" fill="var(--tool-football)"/>
  <circle cx="116" cy="14" r="2" fill="var(--tool-football)" opacity=".5"/>
  <circle cx="146" cy="38" r="1.6" fill="var(--tool-football)" opacity=".5"/>
</svg>`,

  // Radio — no station yet: a rounded retro radio with quiet waves
  radio: `
<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="80" cy="108" rx="54" ry="6" fill="var(--border)" opacity=".6"/>
  <path d="M58 40L96 14" stroke="var(--border-strong)" stroke-width="3" stroke-linecap="round"/>
  <circle cx="96" cy="14" r="4" fill="var(--tool-radio)"/>
  <rect x="30" y="38" width="100" height="64" rx="18" fill="var(--tool-radio)"/>
  <rect x="30" y="38" width="100" height="64" rx="18" fill="url(#rg)" opacity=".35"/>
  <defs><linearGradient id="rg" x1="30" y1="38" x2="130" y2="102"><stop stop-color="#FFC24B"/><stop offset="1" stop-color="#FFC24B" stop-opacity="0"/></linearGradient></defs>
  <circle cx="60" cy="70" r="18" fill="rgba(255,255,255,.22)"/>
  <g fill="#fff" opacity=".85">
    <circle cx="54" cy="64" r="2"/><circle cx="60" cy="64" r="2"/><circle cx="66" cy="64" r="2"/>
    <circle cx="54" cy="70" r="2"/><circle cx="60" cy="70" r="2"/><circle cx="66" cy="70" r="2"/>
    <circle cx="54" cy="76" r="2"/><circle cx="60" cy="76" r="2"/><circle cx="66" cy="76" r="2"/>
  </g>
  <rect x="88" y="54" width="30" height="12" rx="6" fill="rgba(255,255,255,.9)"/>
  <rect x="95" y="57" width="2.5" height="6" rx="1.2" fill="var(--tool-radio)"/>
  <circle cx="94" cy="84" r="6" fill="rgba(255,255,255,.9)"/>
  <circle cx="112" cy="84" r="6" fill="rgba(255,255,255,.9)"/>
  <path d="M140 52a16 16 0 0 1 0 22M147 46a26 26 0 0 1 0 34" stroke="var(--tool-radio)" stroke-width="2.5" stroke-linecap="round" opacity=".45"/>
</svg>`,

  // Language — no decks yet: a fan of flashcards with "Aa" / "あ" / "Ñ"
  decks: `
<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="80" cy="108" rx="52" ry="6" fill="var(--border)" opacity=".6"/>
  <g transform="rotate(-14 56 66)">
    <rect x="30" y="30" width="52" height="68" rx="13" fill="var(--surface-2)" stroke="var(--border-strong)" stroke-width="2"/>
    <text x="56" y="73" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="var(--text-muted)">あ</text>
  </g>
  <g transform="rotate(12 104 66)">
    <rect x="78" y="30" width="52" height="68" rx="13" fill="var(--surface-2)" stroke="var(--border-strong)" stroke-width="2"/>
    <text x="104" y="73" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="var(--text-muted)">Ñ</text>
  </g>
  <rect x="53" y="22" width="54" height="72" rx="14" fill="var(--tool-language)"/>
  <text x="80" y="66" text-anchor="middle" font-family="system-ui, sans-serif" font-size="26" font-weight="800" fill="#fff" letter-spacing="-1">Aa</text>
  <rect x="66" y="76" width="28" height="4" rx="2" fill="rgba(255,255,255,.5)"/>
  <path d="M120 14l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2z" fill="var(--tool-language)" opacity=".6"/>
  <path d="M34 18l1.6 3.4 3.4 1.6-3.4 1.6L34 28l-1.6-3.4-3.4-1.6 3.4-1.6z" fill="var(--tool-language)" opacity=".45"/>
</svg>`,

  // Shared — offline / couldn't load: a cloud with an unplugged cable
  offline: `
<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="80" cy="108" rx="50" ry="6" fill="var(--border)" opacity=".6"/>
  <path d="M48 76h64a20 20 0 0 0 0-40 28 28 0 0 0-53 6 17 17 0 0 0-11 34z" fill="var(--surface-2)" stroke="var(--border-strong)" stroke-width="2"/>
  <path d="M80 76v10" stroke="var(--border-strong)" stroke-width="3" stroke-linecap="round"/>
  <rect x="72" y="86" width="16" height="12" rx="4" fill="var(--text-muted)"/>
  <path d="M76 98v5M84 98v5" stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M100 104c8 0 10-6 18-6" stroke="var(--border-strong)" stroke-width="3" stroke-linecap="round"/>
  <rect x="118" y="92" width="14" height="12" rx="4" fill="var(--border-strong)"/>
  <circle cx="114" cy="40" r="11" fill="var(--live)"/>
  <path d="M114 34v7" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="114" cy="45.5" r="1.6" fill="#fff"/>
</svg>`,
}
