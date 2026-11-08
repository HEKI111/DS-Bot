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
// The rail is one icon wide, so it shows a single character instead of the label.
const shortLabel = mode => t(mode === 'bot' ? 'Bots' : 'Sessions').slice(0, 1)
// A radio group moves with the arrows that follow its orientation, and both axes are
// accepted: the same control is horizontal in the column and vertical on the rail, and
// a user reaching for either pair should not have to know which form is drawn.
const STEP_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])

// Draws as a two-option segmented control. `compact` draws the rail form, which has
// room for one character per option. There is no read-only form: the switch only
// changes what this browser shows, which every window may do.
export function SurfaceSwitch({ mode, actions, className = '', compact = false }) {
  const pick = (next) => {
    if (next === mode) return
    actions.setSurface?.(next)
  }
  const option = (next) => h('button', {
    key: next,
    type: 'button',
    role: 'radio',
    className: 'bt-surface-opt',
    'aria-checked': next === mode,
    // The visible text is a single character on the rail, so the accessible name is
    // spelled out here and the title carries it as the hover hint.
    'aria-label': label(next),
    title: t('Switch to {name}', { name: label(next) }),
    // One stop in the tab order for the group; the arrow keys move within it.
    tabIndex: next === mode ? 0 : -1,
    onClick: () => pick(next),
    onKeyDown: (event) => {
      if (!STEP_KEYS.has(event.key)) return
      event.preventDefault()
      // Two options, so either direction lands on the other one; Up and Down mean
      // the same as Left and Right on the rail.
      const target = next === 'agent' ? 'bot' : 'agent'
      pick(target)
      // Picking a surface may replace the node the key came from, and the switch that
      // survives is the one in the other surface: look the option up again.
      globalThis.document?.querySelector(`[data-surface="${target}"]`)?.focus()
    },
    'data-surface': next,
  }, compact ? shortLabel(next) : label(next))

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
.bt-surface-opt:hover:not([aria-checked="true"]){color:var(--bt-ink)}
.bt-surface-opt[aria-checked="true"]{background:var(--bt-card);color:var(--bt-ink);box-shadow:0 1px 2px var(--bt-line-2)}
.bt-surface-opt:focus-visible{outline:2px solid var(--bt-accent);outline-offset:1px}
/* The rail is one icon wide: stack the two options and show one character each. */
.bt-surface.bt-surface-rail{padding:0;background:none;flex-direction:column;gap:2px}
.bt-surface.bt-surface-rail .bt-surface-opt{width:26px;height:22px;padding:0;font-size:11px;line-height:22px}
/* In the column's top row the switch shares the row with the round actions,
   which the brand's own margin-right:auto already holds to the right. */
.bt-surface.bt-surface-head{flex:0 1 auto;max-width:180px}
`
