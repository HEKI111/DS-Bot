import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cssEscape } from '../src/client/css.js'

// Why this exists at all: `CSS.escape` is a browser global, and inside this profile's
// module loader it was not there. Every call threw, and a shadowing slot entry that
// throws is *abdicated* — the cell hands itself back to the shell's own occupant. The
// team column silently became the native browser that way, so the escaper must not
// depend on any global.

test('a name that needs no escaping comes back unchanged', () => {
  for (const name of ['bt-side', '_centerCol_abc123', 'a1', '--x', '-foo']) {
    assert.equal(cssEscape(name), name)
  }
})

test('the characters a class name may not carry are backslash-escaped', () => {
  assert.equal(cssEscape('a b'), 'a\\ b')
  assert.equal(cssEscape('a:b'), 'a\\:b')
  assert.equal(cssEscape('a.b'), 'a\\.b')
  assert.equal(cssEscape('a/b'), 'a\\/b')
  assert.equal(cssEscape('a"b'), 'a\\"b')
})

test('a leading digit is escaped as a code point, so it cannot read as a number', () => {
  assert.equal(cssEscape('1abc'), '\\31 abc')
  // The second character counts when the first is a hyphen, which would read as a sign.
  assert.equal(cssEscape('-1foo'), '-\\31 foo')
  assert.equal(cssEscape('-'), '\\-')
})

test('a control character becomes a code point escape', () => {
  assert.equal(cssEscape('a\u0001b'), 'a\\1 b')
  assert.equal(cssEscape('\u0000'), '\ufffd')
})

test('it never consults a global CSS object', async () => {
  // The regression: a global `CSS` without `escape` is what broke the sidebar.
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'CSS')
  Object.defineProperty(globalThis, 'CSS', { value: {}, configurable: true, writable: true })
  try {
    assert.equal(cssEscape('a b'), 'a\\ b')
  } finally {
    if (saved === undefined) delete globalThis.CSS
    else Object.defineProperty(globalThis, 'CSS', saved)
  }
})
