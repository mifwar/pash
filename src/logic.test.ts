import { test } from "node:test"
import assert from "node:assert/strict"
import type { Key } from "ink"
import { initialState, isHidden, reducer } from "./state.js"
import { commandFor, editLine } from "./keymap.js"
import { parseEntry } from "./utils/pass.js"

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
