import { randomInt } from "crypto"

export interface PasswordRules {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
  excludeAmbiguous: boolean
  excludeShellUnsafe: boolean
  excludeChars: string
}

export type BooleanRuleKey = Exclude<keyof PasswordRules, "length" | "excludeChars">

export interface RuleToggleSpec {
  key: BooleanRuleKey
  label: string
  hint: string
  /** True for character classes; at least one must remain enabled. */
  isCharset: boolean
}

/** Single source of truth for boolean password rules (rendering + toggling). */
export const PASSWORD_TOGGLES: readonly RuleToggleSpec[] = [
  { key: "uppercase", label: "Uppercase", hint: "A-Z", isCharset: true },
  { key: "lowercase", label: "Lowercase", hint: "a-z", isCharset: true },
  { key: "numbers", label: "Numbers", hint: "0-9", isCharset: true },
  { key: "symbols", label: "Symbols", hint: "!@#$%^&*…", isCharset: true },
  { key: "excludeAmbiguous", label: "No ambiguous", hint: "exclude 0 O 1 l I", isCharset: false },
  {
    key: "excludeShellUnsafe",
    label: "No shell chars",
    hint: "exclude $&*(){}[]|;<>?",
    isCharset: false,
  },
]

export const DEFAULT_PASSWORD_RULES: PasswordRules = {
  length: 25,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
  excludeShellUnsafe: false,
  excludeChars: "",
}

export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 128

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const LOWER = "abcdefghijklmnopqrstuvwxyz"
const NUMBERS = "0123456789"
const SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?"
const AMBIGUOUS = /[0O1lI]/g
const SHELL_UNSAFE = /[$&*(){}[\]|;<>?]/g

export function adjustPasswordLength(rules: PasswordRules, delta: number): PasswordRules {
  const length = Math.min(MAX_PASSWORD_LENGTH, Math.max(MIN_PASSWORD_LENGTH, rules.length + delta))
  return length === rules.length ? rules : { ...rules, length }
}

/** Toggle a boolean rule, refusing to disable the last active character class. */
export function togglePasswordRule(rules: PasswordRules, key: BooleanRuleKey): PasswordRules {
  const next = !rules[key]
  const spec = PASSWORD_TOGGLES.find((t) => t.key === key)
  if (!next && spec?.isCharset) {
    const remaining = PASSWORD_TOGGLES.filter(
      (t) => t.isCharset && (t.key === key ? next : rules[t.key])
    ).length
    if (remaining === 0) return rules
  }
  return { ...rules, [key]: next }
}

export function enabledCharsets(rules: PasswordRules): string[] {
  const excluded = rules.excludeChars ? new Set(rules.excludeChars) : null
  const filter = (s: string) => {
    let out = s
    if (rules.excludeAmbiguous) out = out.replace(AMBIGUOUS, "")
    if (rules.excludeShellUnsafe) out = out.replace(SHELL_UNSAFE, "")
    if (excluded) out = [...out].filter((c) => !excluded.has(c)).join("")
    return out
  }
  const sets: string[] = []
  if (rules.uppercase) sets.push(filter(UPPER))
  if (rules.lowercase) sets.push(filter(LOWER))
  if (rules.numbers) sets.push(filter(NUMBERS))
  if (rules.symbols) sets.push(filter(SYMBOLS))
  return sets.filter((s) => s.length > 0)
}

/**
 * Cryptographically secure password generator honoring `rules`.
 * Guarantees at least one character from each enabled class, then
 * shuffles with Fisher-Yates using `crypto.randomInt`.
 */
export function generatePassword(rules: PasswordRules): string {
  const sets = enabledCharsets(rules)
  if (sets.length === 0) {
    throw new Error("No characters available with current rules/exclusions")
  }
  const length = Math.min(MAX_PASSWORD_LENGTH, Math.max(MIN_PASSWORD_LENGTH, rules.length))
  const pool = sets.join("")
  const chars: string[] = []

  for (const set of sets) {
    chars.push(set[randomInt(set.length)])
  }
  while (chars.length < length) {
    chars.push(pool[randomInt(pool.length)])
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join("")
}
