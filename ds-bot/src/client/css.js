// A local CSS identifier escaper.
//
// `CSS.escape` is a browser global, and a plugin's module scope is not guaranteed to
// see the browser's globals: under this profile's module loader `CSS` resolved to
// something without `escape`, so every call threw, the offending slot entry was
// reported as crashed and — for a shadowing kind — abdicated, handing the cell back
// to the shell's own occupant. That is how the team column silently turned into the
// native browser. Two dozen characters of our own remove the dependency.
const SAFE = /[A-Za-z0-9_-]/
export function cssEscape(value) {
  const text = String(value)
  let out = ''
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    const code = text.charCodeAt(i)
    if (code === 0) { out += '\ufffd'; continue }
    // A leading digit would read as a number, and a leading hyphen-digit as a sign.
    if ((i === 0 && code >= 0x30 && code <= 0x39) || (i === 1 && code >= 0x30 && code <= 0x39 && text[0] === '-')) {
      out += `\\${code.toString(16)} `
      continue
    }
    if (code < 0x20 || code === 0x7f) { out += `\\${code.toString(16)} `; continue }
    if (i === 0 && text.length === 1 && ch === '-') { out += '\\-'; continue }
    out += SAFE.test(ch) ? ch : `\\${ch}`
  }
  return out
}
