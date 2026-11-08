import { createElement as h } from 'react'
import { t } from './i18n.js'

// The two places a user can be: DSH's own interface (`agent`) and the Bot team
// (`bot`). It is the same value `surface.mode` carries; this module only draws the
// control that changes it.
//
// The switch stays reachable the whole time. DS Bot withdraws every Bot surface in
// Agent mode, so a control that lived only in the team column could be seen exactly
// once and never found again — which is how users got stuck in the other direction,
// with no visible way back to their own Sessions.

const TABS = [
  { mode: 'agent', label: 'Sessions' },
  { mode: 'bot', label: 'Bots' },
]

// Draws as a two-tab segmented control. `readOnly` keeps it visible but inert where
// the team cannot change (a second DSH holding the data lock): the switch is chrome
// for the surface, not a write to the team.
export function SurfaceSwitch({ mode, actions, readOnly = false, className = '' }) {
  const pick = (next) => {
    if (readOnly || next === mode) return
    actions.setSurface?.(next)
  }
  const switchTo = (next) => h('button', {
    key: next,
    type: 'button',
    role: 'tab',
    className: 'bt-surface-tab',
    'aria-selected': next === mode,
    'aria-controls': 'bt-surface',
    // The native title is the whole affordance on the rail, where the labels hide.
    title: readOnly ? t('This window is read-only') : t('Switch to {name}', { name: t(next === 'bot' ? 'Bots' : 'Sessions') }),
    tabIndex: next === mode ? 0 : -1,
    disabled: readOnly,
    onClick: () => pick(next),
    onKeyDown: (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      const target = next === 'agent' ? 'bot' : 'agent'
      pick(target)
      event.currentTarget.parentElement?.querySelector(`[data-tab="${target}"]`)?.focus()
    },
    'data-tab': next,
  }, t(labelOf(next)))

  return h('div', { className: `bt-surface ${className}`.trim(), role: 'tablist', 'aria-label': t('Interface'), 'data-mode': mode },
    TABS.map(tab => switchTo(tab.mode)))
}

function labelOf(mode) {
  return mode === 'bot' ? 'Bots' : 'Sessions'
}

export const SURFACE_SWITCH_CSS = `
.bt-surface{display:flex;align-items:center;gap:2px;padding:2px;border-radius:999px;background:var(--bt-tag-bg)}
.bt-surface-tab{flex:1 1 auto;min-width:0;padding:0 10px;height:24px;border:0;border-radius:999px;background:none;color:var(--bt-ink-2);font:inherit;font-size:12px;line-height:24px;font-weight:500;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:background-color .12s ease,color .12s ease}
.bt-surface-tab:hover:not([aria-selected="true"]):not(:disabled){color:var(--bt-ink)}
.bt-surface-tab[aria-selected="true"]{background:var(--bt-card);color:var(--bt-ink);box-shadow:0 1px 2px var(--bt-line-2)}
.bt-surface-tab:disabled{cursor:default;opacity:.55}
.bt-surface-tab:focus-visible{outline:2px solid var(--bt-accent);outline-offset:1px}
/* The rail has no room for two labels: the active mode still reads as a dot. */
.bt-surface.bt-surface-rail{padding:0;background:none;flex-direction:column;gap:2px}
.bt-surface.bt-surface-rail .bt-surface-tab{width:28px;height:22px;padding:0;font-size:9px;line-height:22px;letter-spacing:.02em}
/* In the column's top row the switch sits between the brand and the round
   actions, so it shrinks before they do. */
.bt-surface.bt-surface-head{flex:0 1 auto;max-width:180px;margin-right:auto}
`
