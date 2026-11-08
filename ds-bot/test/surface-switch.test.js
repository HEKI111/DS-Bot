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

// Every rendered node, depth first. Children may be strings or nested arrays,
// which the `.map` over the tabs produces.
const walk = node => {
  if (Array.isArray(node)) return node.flatMap(walk)
  if (node === null || node === undefined || typeof node !== 'object') return []
  return [node, ...walk(node.props?.children ?? [])]
}

const tabsOf = tree => walk(tree).filter(node => node.props?.role === 'tab')

function draw(props) {
  return SurfaceSwitch({ actions: {}, mode: 'bot', ...props })
}

test('both surfaces are always offered, and the current one is marked', () => {
  const tabs = tabsOf(draw({ mode: 'bot' }))
  assert.deepEqual(tabs.map(tab => tab.props['data-tab']), ['agent', 'bot'])
  assert.deepEqual(tabs.map(tab => tab.props['aria-selected']), [false, true])
  // The unselected tab stays focusable by arrow key, not by tab.
  assert.deepEqual(tabs.map(tab => tab.props.tabIndex), [-1, 0])
})

test('the marking follows the mode, so Agent mode points back at the Bots', () => {
  const tabs = tabsOf(draw({ mode: 'agent' }))
  assert.deepEqual(tabs.map(tab => tab.props['aria-selected']), [true, false])
})

test('picking a surface asks for the other one, and picks the current one for nothing', () => {
  const asked = []
  const actions = { setSurface: mode => asked.push(mode) }
  const tabs = tabsOf(draw({ mode: 'bot', actions }))
  tabs[0].props.onClick()
  tabs[1].props.onClick()
  assert.deepEqual(asked, ['agent'])
})

test('a read-only window shows the switch but changes nothing', () => {
  const asked = []
  const tabs = tabsOf(draw({ mode: 'bot', readOnly: true, actions: { setSurface: mode => asked.push(mode) } }))
  assert.equal(tabs.every(tab => tab.props.disabled), true)
  for (const tab of tabs) tab.props.onClick()
  assert.deepEqual(asked, [])
})

test('arrow keys move to the other tab', () => {
  const asked = []
  const actions = { setSurface: mode => asked.push(mode) }
  const tabs = tabsOf(draw({ mode: 'bot', actions }))
  let prevented = false
  tabs[1].props.onKeyDown({ key: 'ArrowLeft', preventDefault: () => { prevented = true } })
  assert.equal(prevented, true)
  assert.deepEqual(asked, ['agent'])
  // Keys the control does not own are left to the page.
  tabs[1].props.onKeyDown({ key: 'Enter', preventDefault: () => { prevented = false } })
  assert.deepEqual(asked, ['agent'])
})
