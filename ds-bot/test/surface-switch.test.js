import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

// The switch imports react and the dictionary; bundle it the way the sidebar tests do
// so the component runs as a plain function and the tree can be walked.
const PLUGIN = dirname(dirname(fileURLToPath(import.meta.url)))
const { outputFiles } = await build({
  stdin: { contents: "export { SurfaceSwitch } from './src/client/surface-switch.js'", resolveDir: PLUGIN },
  bundle: true, format: 'cjs', platform: 'browser', write: false, logLevel: 'silent',
  external: ['react', 'react-dom', '@deepseek-ai/dsh-client-ui-primitives'],
})

const module = { exports: {} }
new Function('require', 'module', 'exports', outputFiles[0].text)(
  () => ({ createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) }),
  module, module.exports)
const { SurfaceSwitch } = module.exports

// Every rendered node, depth first. Children may be strings or nested arrays, which
// the `.map` over the options produces.
const walk = node => {
  if (Array.isArray(node)) return node.flatMap(walk)
  if (node === null || node === undefined || typeof node !== 'object') return []
  return [node, ...walk(node.props?.children ?? [])]
}

const optionsOf = tree => walk(tree).filter(node => node.props?.role === 'radio')

function draw(props) {
  return SurfaceSwitch({ actions: {}, mode: 'bot', ...props })
}

test('both surfaces are always offered, and the current one is marked', () => {
  const options = optionsOf(draw({ mode: 'bot' }))
  assert.deepEqual(options.map(option => option.props['data-surface']), ['agent', 'bot'])
  assert.deepEqual(options.map(option => option.props['aria-checked']), [false, true])
  // One stop in the tab order for the group; the arrow keys move within it.
  assert.deepEqual(options.map(option => option.props.tabIndex), [-1, 0])
})

test('the marking follows the mode, so Agent mode points back at the Bots', () => {
  const options = optionsOf(draw({ mode: 'agent' }))
  assert.deepEqual(options.map(option => option.props['aria-checked']), [true, false])
})

const groupOf = tree => walk(tree).find(node => node.props?.role === 'radiogroup')

test('the group describes itself, and turns vertical on the rail', () => {
  assert.equal(groupOf(draw({})).props['aria-orientation'], 'horizontal')
  assert.equal(groupOf(draw({ className: 'bt-surface-rail' })).props['aria-orientation'], 'vertical')
})

// The visible label of an option: the glyph is decoration, so read only the text.
const textsOf = options => options.map(option => walk(option.props.children)
  .flatMap(node => (typeof node === 'string' ? [] : node.props?.children ?? []))
  .filter(child => typeof child === 'string')
  .join(''))

test('the wide form labels both surfaces, the rail form shows one character', () => {
  assert.deepEqual(textsOf(optionsOf(draw({}))), ['Sessions', 'Bots'])
  assert.deepEqual(textsOf(optionsOf(draw({ compact: true }))), ['S', 'B'])
  // The visible character is not the name a screen reader should read out.
  assert.deepEqual(optionsOf(draw({ compact: true })).map(option => option.props['aria-label']), ['Sessions', 'Bots'])
})

test('the wide form leads with a glyph, the rail form has no room for one', () => {
  const glyphs = options => options.filter(option => walk(option.props.children).some(node => node.type?.name === 'Glyph'))
  assert.equal(glyphs(optionsOf(draw({}))).length, 2)
  assert.equal(glyphs(optionsOf(draw({ compact: true }))).length, 0)
})

test('the thumb is decoration and follows the mode, not the checked option', () => {
  const thumb = tree => walk(tree).find(node => node.props?.className === 'bt-surface-thumb')
  assert.equal(thumb(draw({ mode: 'agent' })).props['aria-hidden'], true)
  // Both options agree with the group, so CSS can move the thumb from data-mode alone.
  assert.equal(groupOf(draw({ mode: 'bot' })).props['data-mode'], 'bot')
})

test('picking a surface asks for the other one, and picks the current one for nothing', () => {
  const asked = []
  const actions = { setSurface: mode => asked.push(mode) }
  const options = optionsOf(draw({ mode: 'bot', actions }))
  options[0].props.onClick()
  options[1].props.onClick()
  assert.deepEqual(asked, ['agent'])
})

test('a read-only window can still change what it shows', () => {
  // The read-only lock gates writes to the team; the surface is this browser's view,
  // so a second DSH holding the data lock must not trap the user in one surface.
  const asked = []
  const options = optionsOf(draw({ mode: 'bot', actions: { setSurface: mode => asked.push(mode) } }))
  assert.equal(options.some(option => option.props.disabled), false)
  options[0].props.onClick()
  assert.deepEqual(asked, ['agent'])
})

test('arrow keys move to the other surface, other keys are left to the page', () => {
  const asked = []
  const actions = { setSurface: mode => asked.push(mode) }
  const options = optionsOf(draw({ mode: 'bot', actions }))
  let prevented = false
  options[1].props.onKeyDown({ key: 'ArrowLeft', preventDefault: () => { prevented = true } })
  assert.equal(prevented, true)
  assert.deepEqual(asked, ['agent'])
  // Up and Down do the same: the rail's form is vertical, and the same control is
  // drawn in both orientations.
  options[1].props.onKeyDown({ key: 'ArrowDown', preventDefault: () => {} })
  assert.deepEqual(asked, ['agent', 'agent'])
  options[1].props.onKeyDown({ key: 'Enter', preventDefault: () => { prevented = false } })
  assert.deepEqual(asked, ['agent', 'agent'])
})

// A surface change re-renders the whole page, so the replacement switch is not in the
// DOM yet when the key handler returns. Focus must land on it afterwards, or the group
// is left unfocused and the arrows stop working after one press.
test('the arrow key hands focus to the switch the new surface draws', async () => {
  const focused = []
  let drawnYet = false
  const spy = setTimeout
  globalThis.document = {
    // Nothing to focus until the deferred pass; this is what a real re-render looks
    // like from the handler's point of view.
    querySelector: () => (drawnYet ? { focus: () => focused.push('focused') } : null),
  }
  // The component defers with the page's timer; run it as soon as it is scheduled.
  globalThis.setTimeout = run => { drawnYet = true; run() }
  try {
    const options = optionsOf(draw({ mode: 'bot', actions: { setSurface: () => {} } }))
    options[1].props.onKeyDown({ key: 'ArrowLeft', preventDefault: () => {} })
    assert.deepEqual(focused, ['focused'])
  } finally {
    globalThis.setTimeout = spy
    delete globalThis.document
  }
})
