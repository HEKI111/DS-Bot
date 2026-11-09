import { createElement as h } from 'react'
import { t } from './i18n.js'

// The two places a user can be: DSH's own interface (`agent`) and the Bot team
// (`bot`). It is the same value `surface.mode` carries; this module only draws the
// control that changes it.
//
// The switch is drawn as one floating widget in the frame's title band, both modes, so
// it is always in the same place: an inline seat put it wherever that column's row
// happened to have room, which moved it between surfaces and pushed the host plugin's
// own controls aside.
//
// The choice is a radio group, not tabs: a tablist promises a tabpanel per tab, and
// nothing here is a panel — picking one swaps the whole application surface.

const SURFACES = ['agent', 'bot']

const label = mode => t(mode === 'bot' ? 'Bots' : 'Sessions')

// A radio group moves with the arrows that follow its orientation, and both axes are
// accepted: the widget is horizontal, and a user reaching for Up or Down should not
// have to know that.
const STEP_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])

// Focus the option for `target` once the shell has drawn it. The pick re-renders the
// whole surface, so the button that took the key is unmounted while this runs and a
// synchronous lookup would focus the node about to be removed — leaving the focus on
// <body> and the keyboard unable to move the choice again. The deferred pass lands
// after React commits the replacement switch.
function focusSurface(target) {
  const find = () => globalThis.document?.querySelector(`[data-surface="${target}"]`)
  find()?.focus()
  setTimeout(() => { find()?.focus() }, 0)
}

// A chat bubble for the shell's own Sessions, a small robot for the Bot team. Drawn
// here rather than imported: two 14px glyphs are cheaper than a dependency, and the
// stroke follows the label's colour as it dims and brightens.
const Glyph = ({ mode }) => h('svg', {
  className: 'bt-surface-ico', width: 14, height: 14, viewBox: '0 0 16 16', 'aria-hidden': true,
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
}, mode === 'bot'
  ? [
    // antenna, head, eyes
    h('path', { key: 'a', d: 'M8 1.6v1.6' }),
    h('circle', { key: 'b', cx: 8, cy: 1.2, r: 0.9, fill: 'currentColor', stroke: 'none' }),
    h('rect', { key: 'c', x: 2.6, y: 3.4, width: 10.8, height: 8.4, rx: 2.6 }),
    h('circle', { key: 'd', cx: 6, cy: 7.4, r: 1, fill: 'currentColor', stroke: 'none' }),
    h('circle', { key: 'e', cx: 10, cy: 7.4, r: 1, fill: 'currentColor', stroke: 'none' }),
    h('path', { key: 'f', d: 'M6.4 9.9h3.2' }),
  ]
  : [
    h('path', { key: 'a', d: 'M13.4 8.2c0 2.6-2.4 4.7-5.4 4.7-.6 0-1.2-.1-1.7-.3L3.4 14l.8-2.5c-1-1-1.6-2.2-1.6-3.5 0-2.6 2.4-4.7 5.4-4.7s5.4 2.1 5.4 4.9z' }),
    h('path', { key: 'b', d: 'M6.1 8.3h.01M8 8.3h.01M9.9 8.3h.01', strokeWidth: 1.9 }),
  ])

// Draws as a two-option segmented control with a thumb that springs between the two.
// There is no read-only form: the switch only changes what this browser shows, which
// every window may do.
export function SurfaceSwitch({ mode, actions }) {
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
    'aria-label': label(next),
    title: t('Switch to {name}', { name: label(next) }),
    // One stop in the tab order for the group; the arrow keys move within it.
    tabIndex: next === mode ? 0 : -1,
    onClick: () => pick(next),
    onKeyDown: (event) => {
      if (!STEP_KEYS.has(event.key)) return
      event.preventDefault()
      // Two options, so either direction lands on the other one.
      const target = next === 'agent' ? 'bot' : 'agent'
      pick(target)
      focusSurface(target)
    },
    'data-surface': next,
  },
  h(Glyph, { key: 'ico', mode: next }),
  h('span', { key: 'text', className: 'bt-surface-txt' }, label(next)))

  // The thumb is decoration: the checked option is what assistive tech reads, and the
  // thumb only follows `data-mode`.
  return h('div', {
    className: 'bt-surface',
    role: 'radiogroup',
    'aria-label': t('Interface'),
    'aria-orientation': 'horizontal',
    'data-mode': mode,
  },
  h('span', { className: 'bt-surface-thumb', 'aria-hidden': true }),
  SURFACES.map(option))
}

export const SURFACE_SWITCH_CSS = `
/* One fixed size wherever the widget is drawn. Every colour is derived from
   currentColor or the accent: the theme sheet belongs to the shell group, which Agent
   mode withdraws, so a --bt-* value would vanish on the surface the switch is most
   needed. */
.bt-surface{position:relative;display:inline-flex;flex:none;align-items:stretch;box-sizing:border-box;width:158px;height:28px;padding:2px;border-radius:999px;background:color-mix(in srgb,currentColor 7%,transparent);box-shadow:inset 0 1px 2px color-mix(in srgb,currentColor 12%,transparent)}
/* The thumb carries the accent, so the picked surface reads at a glance in both
   themes. The variable is painted on :root by index.js, outside the theme sheet, so
   Agent mode keeps it too; the fallbacks only cover the first frame. */
.bt-surface-thumb{position:absolute;top:2px;left:2px;width:calc(50% - 2px);height:calc(100% - 4px);border-radius:999px;background:linear-gradient(180deg,color-mix(in srgb,var(--bt-surface-accent,var(--bt-accent,currentColor)) 42%,transparent),color-mix(in srgb,var(--bt-surface-accent,var(--bt-accent,currentColor)) 20%,transparent));box-shadow:0 1px 6px color-mix(in srgb,var(--bt-surface-accent,var(--bt-accent,currentColor)) 34%,transparent),inset 0 1px 0 color-mix(in srgb,currentColor 34%,transparent),inset 0 -1px 0 color-mix(in srgb,currentColor 8%,transparent);transition:transform .42s cubic-bezier(.34,1.5,.5,1)}
.bt-surface[data-mode="bot"] .bt-surface-thumb{transform:translateX(100%)}
.bt-surface-opt{position:relative;z-index:1;flex:1 1 0;display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:0;padding:0 6px;border:0;border-radius:999px;background:none;color:inherit;opacity:.55;font:inherit;font-size:11.5px;font-weight:500;line-height:1;cursor:pointer;overflow:hidden;white-space:nowrap;transition:opacity .22s ease,transform .22s ease}
.bt-surface-opt:hover:not([aria-checked="true"]){opacity:.85}
.bt-surface-opt[aria-checked="true"]{opacity:1;font-weight:600}
.bt-surface-opt:active{transform:scale(.96)}
.bt-surface-opt:focus-visible{outline:2px solid var(--bt-surface-accent,var(--bt-accent,currentColor));outline-offset:2px}
.bt-surface-ico{flex:none;width:12px;height:12px;opacity:.9;transition:transform .42s cubic-bezier(.34,1.5,.5,1)}
.bt-surface-opt[aria-checked="true"] .bt-surface-ico{transform:scale(1.12)}
.bt-surface-txt{overflow:hidden;text-overflow:ellipsis}
@media (prefers-reduced-motion: reduce){
  .bt-surface-thumb,.bt-surface-opt,.bt-surface-ico{transition:none}
}
`
