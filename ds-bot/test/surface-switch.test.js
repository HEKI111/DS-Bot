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
const groupOf = tree => walk(tree).find(node => node.props?.role === 'radiogroup')

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

test('the group describes itself as one horizontal radio group', () => {
  const group = groupOf(draw({}))
  assert.equal(group.props.role, 'radiogroup')
  assert.equal(group.props['aria-label'], 'Interface')
  assert.equal(group.props['aria-orientation'], 'horizontal')
})

// The visible label of an option: the glyph is decoration, so read only the text.
const textsOf = options => options.map(option => walk(option.props.children)
  .flatMap(node => (typeof node === 'string' ? [] : node.props?.children ?? []))
  .filter(child => typeof child === 'string')
  .join(''))

test('both surfaces are labelled in words, not by their glyph alone', () => {
  assert.deepEqual(textsOf(optionsOf(draw({}))), ['Sessions', 'Bots'])
  assert.deepEqual(optionsOf(draw({})).map(option => option.props['aria-label']), ['Sessions', 'Bots'])
})

test('each option leads with its glyph', () => {
  const glyphs = options => options.filter(option => walk(option.props.children).some(node => node.type?.name === 'Glyph'))
  assert.equal(glyphs(optionsOf(draw({}))).length, 2)
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

// The switch only changes what this browser shows, so a window that cannot write to
// the team can still change surfaces — passing `readOnly` would have locked it in.
test('a read-only window can still change what it shows', () => {
  const asked = []
  const actions = { setSurface: mode => asked.push(mode) }
  optionsOf(draw({ mode: 'bot', actions, readOnly: true }))[0].props.onClick()
  assert.deepEqual(asked, ['agent'])
})

test('arrow keys move to the other surface, other keys are left to the page', () => {
  const asked = []
  const actions = { setSurface: mode => asked.push(mode) }
  const option = optionsOf(draw({ mode: 'bot', actions }))[1]
  let prevented = false
  option.props.onKeyDown({ key: 'ArrowLeft', preventDefault: () => { prevented = true } })
  assert.equal(prevented, true)
  assert.deepEqual(asked, ['agent'])
  asked.length = 0
  option.props.onKeyDown({ key: 'Tab', preventDefault: () => { prevented = true } })
  assert.deepEqual(asked, [])
})

// The pick swaps the whole surface, so the button that took the key is unmounted while
// the handler runs. Without the deferred second pass the focus lands on <body> and the
// keyboard cannot move the choice again.
test('the arrow key hands focus to the switch the new surface draws', () => {
  const focused = []
  const nodes = { agent: { focus: () => focused.push('agent') }, bot: { focus: () => focused.push('bot') } }
  const hadDocument = 'document' in globalThis
  const hadTimer = 'setTimeout' in globalThis
  globalThis.document = { querySelector: selector => nodes[selector.match(/data-surface="(\w+)"/)?.[1]] ?? null }
  // Run the deferred pass at once, so the assertion does not wait on a real timer.
  globalThis.setTimeout = fn => { fn(); return 0 }
  try {
    const asked = []
    optionsOf(SurfaceSwitch({ actions: { setSurface: mode => asked.push(mode) }, mode: 'bot' }))[1]
      .props.onKeyDown({ key: 'ArrowLeft', preventDefault: () => {} })
    assert.deepEqual(asked, ['agent'])
    // Once synchronously, once after the shell redraws.
    assert.deepEqual(focused, ['agent', 'agent'])
  } finally {
    if (hadDocument) delete globalThis.document
    if (hadTimer) delete globalThis.setTimeout
  }
})
