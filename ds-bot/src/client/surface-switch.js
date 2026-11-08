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
//
// The choice is a radio group, not tabs: a tablist promises a tabpanel per tab, and
// nothing here is a panel — picking one swaps the whole application surface.

const SURFACES = ['agent', 'bot']

const label = mode => t(mode === 'bot' ? 'Bots' : 'Sessions')

// Draws as a two-option segmented control. `readOnly` keeps it visible but inert
// where the team cannot change (a second DSH holding the data lock): the switch is
// chrome for the surface, not a write to the team.
export function SurfaceSwitch({ mode, actions, readOnly = false, className = '' }) {
  const pick = (next) => {
    if (readOnly || next === mode) return
    actions.setSurface?.(next)
  }
  const option = (next) => h('button', {
    key: next,
    type: 'button',
    role: 'radio',
    className: 'bt-surface-opt',
    'aria-checked': next === mode,
    // The native title is the whole affordance on the rail, where the labels hide.
    title: readOnly ? t('This window is read-only') : t('Switch to {name}', { name: label(next) }),
    // One stop in the tab order for the group; the arrow keys move within it.
    tabIndex: next === mode ? 0 : -1,
    disabled: readOnly,
    onClick: () => pick(next),
    onKeyDown: (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      const target = next === 'agent' ? 'bot' : 'agent'
      pick(target)
      // One of the two switches is on the page, and picking may have replaced the
      // node the key came from: look the option up again rather than reuse it.
      globalThis.document?.querySelector(`[data-surface="${target}"]`)?.focus()
    },
    'data-surface': next,
  }, label(next))

  return h('div', {
    className: `bt-surface ${className}`.trim(),
    role: 'radiogroup',
    'aria-label': t('Interface'),
    'aria-orientation': className.includes('bt-surface-rail') ? 'vertical' : 'horizontal',
    'data-mode': mode,
  }, SURFACES.map(option))
}

export const SURFACE_SWITCH_CSS = `
.bt-surface{display:flex;align-items:center;gap:2px;padding:2px;border-radius:999px;background:var(--bt-tag-bg)}
.bt-surface-opt{flex:1 1 auto;min-width:0;padding:0 10px;height:24px;border:0;border-radius:999px;background:none;color:var(--bt-ink-2);font:inherit;font-size:12px;line-height:24px;font-weight:500;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:background-color .12s ease,color .12s ease}
.bt-surface-opt:hover:not([aria-checked="true"]):not(:disabled){color:var(--bt-ink)}
.bt-surface-opt[aria-checked="true"]{background:var(--bt-card);color:var(--bt-ink);box-shadow:0 1px 2px var(--bt-line-2)}
.bt-surface-opt:disabled{cursor:default;opacity:.55}
.bt-surface-opt:focus-visible{outline:2px solid var(--bt-accent);outline-offset:1px}
/* The rail has no room for two labels: the active mode still reads as a dot. */
.bt-surface.bt-surface-rail{padding:0;background:none;flex-direction:column;gap:2px}
.bt-surface.bt-surface-rail .bt-surface-opt{width:28px;height:22px;padding:0;font-size:9px;line-height:22px;letter-spacing:.02em}
/* In the column's top row the switch sits beside the brand and the round actions,
   so it shrinks before they do. */
.bt-surface.bt-surface-head{flex:0 1 auto;max-width:180px;margin-right:auto}
`
