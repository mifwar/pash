import { test } from "node:test"
import assert from "node:assert/strict"
import type { Key } from "ink"
import { initialState, isHidden, reducer } from "./state.js"
import { commandFor, editLine } from "./keymap.js"
import { parseEntry, setPassword } from "./utils/pass.js"
import {
  DEFAULT_PASSWORD_RULES,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  generatePassword,
} from "./utils/password.js"
import { initialInsertState, insertReducer } from "./components/InsertPanel.js"
import { transformFrame } from "./utils/screen.js"

const key = (k: Partial<Key> = {}) => k as Key
const select = (s: typeof initialState, index: number, rows = 5, total = 20) =>
  reducer(s, { type: "select", index, rows, total })

test("select clamps and scrolls minimally", () => {
  let s = select(initialState, 7) // past the 5-row window
  assert.deepEqual([s.selectedIndex, s.scrollOffset], [7, 3])
  s = select(s, 5) // still visible: no scroll
  assert.deepEqual([s.selectedIndex, s.scrollOffset], [5, 3])
  s = select(s, 99) // bottom
  assert.deepEqual([s.selectedIndex, s.scrollOffset], [19, 15])
  s = select(s, -4) // top
  assert.deepEqual([s.selectedIndex, s.scrollOffset], [0, 0])
  assert.equal(select(s, 0), s, "no-op returns same state")
  s = select(select(initialState, 19), 19, 5, 3) // list shrank
  assert.deepEqual([s.selectedIndex, s.scrollOffset], [2, 0])
})

test("isHidden checks every ancestor", () => {
  const collapsed = new Set(["cloud"])
  assert.equal(isHidden(collapsed, "cloud/aws"), true)
  assert.equal(isHidden(collapsed, "cloud"), true)
  assert.equal(isHidden(collapsed, "cloudy"), false)
  assert.equal(isHidden(collapsed, ""), false)
})

test("editLine handles typing, paste, backspace, control keys", () => {
  assert.equal(editLine("ab", "c", key()), "abc")
  assert.equal(editLine("ab", "cde", key()), "abcde")
  assert.equal(editLine("ab", "", key({ backspace: true })), "a")
  assert.equal(editLine("ab", "n", key({ ctrl: true })), null)
  assert.equal(editLine("ab", "\t", key()), null)
})

test("commandFor maps keys and special keys", () => {
  assert.equal(commandFor("j", key()), "down")
  assert.equal(commandFor("", key({ downArrow: true })), "down")
  assert.equal(commandFor("d", key({ ctrl: true })), "pageDown")
  assert.equal(commandFor("", key({ escape: true })), "back")
  assert.equal(commandFor("z", key()), undefined)
})

test("parseEntry splits frontmatter from password", () => {
  const p = parseEntry("# Login: me\n# URL: x.com\n\nhunter2\nextra")
  assert.deepEqual(p.frontmatter, { login: "me", url: "x.com" })
  assert.equal(p.password, "hunter2")
})

test("setPassword replaces only the password line", () => {
  assert.equal(setPassword("# Login: me\n\nold\nextra\n", "new"), "# Login: me\n\nnew\nextra\n")
  assert.equal(setPassword("old", "new"), "new")
  assert.equal(setPassword("# Login: me", "new"), "# Login: me\nnew")
})

test("generatePassword honors length, charsets, and excludeAmbiguous", () => {
  const pw = generatePassword({ ...DEFAULT_PASSWORD_RULES, length: 32 })
  assert.equal(pw.length, 32)
  assert.match(pw, /[A-Z]/)
  assert.match(pw, /[a-z]/)
  assert.match(pw, /[0-9]/)
  assert.match(pw, /[^A-Za-z0-9]/)

  const noSym = generatePassword({
    length: 40,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: false,
    excludeAmbiguous: true,
  })
  assert.equal(noSym.length, 40)
  assert.match(noSym, /^[A-Za-z0-9]+$/)
  assert.doesNotMatch(noSym, /[0O1lI]/)

  assert.throws(() =>
    generatePassword({
      length: 16,
      uppercase: false,
      lowercase: false,
      numbers: false,
      symbols: false,
      excludeAmbiguous: false,
    })
  )
})

test("insertReducer manages steps, length clamping, and keeps at least one charset", () => {
  let s = insertReducer(initialInsertState, { type: "path", value: "email/test" })
  s = insertReducer(s, { type: "step", step: "method" })
  assert.equal(s.step, "method")
  assert.equal(s.method, "generate")

  // Length clamps to [MIN, MAX]
  s = insertReducer(s, { type: "length", delta: -100 })
  assert.equal(s.rules.length, MIN_PASSWORD_LENGTH)
  s = insertReducer(s, { type: "length", delta: 500 })
  assert.equal(s.rules.length, MAX_PASSWORD_LENGTH)

  // Disable uppercase (1), lowercase (2), numbers (3) — symbols (4) must refuse to disable
  for (const idx of [1, 2, 3]) {
    s = insertReducer(s, { type: "move-rule", delta: idx - s.ruleIndex })
    s = insertReducer(s, { type: "toggle-rule" })
  }
  assert.equal(s.rules.uppercase, false)
  assert.equal(s.rules.lowercase, false)
  assert.equal(s.rules.numbers, false)
  assert.equal(s.rules.symbols, true)

  s = insertReducer(s, { type: "move-rule", delta: 1 })
  const beforeLastToggle = s
  s = insertReducer(s, { type: "toggle-rule" })
  assert.equal(s, beforeLastToggle, "cannot disable the last remaining character class")

  // Switching to manual and toggling visibility
  s = insertReducer(s, { type: "toggle-method" })
  assert.equal(s.method, "manual")
  s = insertReducer(s, { type: "manual-password", value: "secret" })
  s = insertReducer(s, { type: "toggle-visibility" })
  assert.equal(s.manualPassword, "secret")
  assert.equal(s.showManualPassword, true)
})

test("transformFrame replaces full-screen clear with home+erase-to-EOL and sync output", () => {
  const out = transformFrame("\x1b[2J\x1b[3J\x1b[Hline1\nline2")
  assert.equal(out, "\x1b[?2026h\x1b[Hline1\x1b[K\nline2\x1b[K\x1b[J\x1b[?2026l")
  assert.equal(transformFrame("partial"), "\x1b[?2026hpartial\x1b[?2026l")
  assert.equal(transformFrame(""), "")
})
