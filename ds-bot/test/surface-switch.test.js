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

test('the rail form shows one character but keeps the full name for assistive tech', () => {
  const text = options => options.map(option => option.props.children.join(''))
  assert.deepEqual(text(optionsOf(draw({}))), ['Sessions', 'Bots'])
  assert.deepEqual(text(optionsOf(draw({ compact: true }))), ['S', 'B'])
  // The visible character is not the name a screen reader should read out.
  assert.deepEqual(optionsOf(draw({ compact: true })).map(option => option.props['aria-label']), ['Sessions', 'Bots'])
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
