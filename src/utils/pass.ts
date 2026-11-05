import { execFile } from "child_process"
import { promisify } from "util"

const execFileP = promisify(execFile)

/** The `pass` binary: $PASH_PASS (test hook), else `pass` on $PATH. */
function passBin(): string {
  return process.env.PASH_PASS ?? "pass"
}

/**
 * Decrypt a single entry. Returns the plaintext body.
 *
 * Throws on GPG agent failure, missing entry, etc. Caller surfaces
 * the error as a toast.
 *
 * Uses execFile (no shell) so paths with spaces or shell metacharacters
 * are safe.
 */
export async function passShow(entryPath: string): Promise<string> {
  const { stdout } = await execFileP(passBin(), ["show", entryPath], {
    maxBuffer: 1024 * 1024,
  })
  return stdout
}

/**
 * Generate a new entry via `pass generate`. Auto-generates a 25-char
 * password and creates the .gpg file (and any missing parent groups).
 *
 * Throws on GPG agent failure, invalid path, etc. Caller toasts the
 * error. `pass generate` prints the new password on stdout — we
 * discard it (the user can `p` to preview after reload).
 */
export async function passGenerate(entryPath: string): Promise<void> {
  await execFileP(passBin(), ["generate", entryPath], {
    maxBuffer: 1024 * 1024,
  })
}

/**
 * Parsed shape of a `pass` entry's plaintext.
 *
 * `pass` entries conventionally start with `# Key: value` lines
 * (the `pass-extension-meta` convention) followed by the actual
 * password on the first non-`#` non-blank line. We surface both so
 * the UI can show metadata without ever rendering the password
 * unless the user explicitly opts in.
 */
export type ParsedEntry = {
  /** Frontmatter map, lowercased keys. Empty if no `# Key: value` lines. */
  frontmatter: Record<string, string>
  /** First non-frontmatter non-blank line. The actual password. May be "". */
  password: string
  /** Full plaintext, unmodified. */
  body: string
}

/**
 * Split a decrypted `pass show` body into frontmatter + password.
 *
 * Conservative: anything that doesn't match `^#\s*(\w+):\s*(.*)$` ends
 * the frontmatter block. The password is the first non-empty line
 * after that.
 */
export function parseEntry(plaintext: string): ParsedEntry {
  const lines = plaintext.split("\n")
  const frontmatter: Record<string, string> = {}

  let i = 0
  for (; i < lines.length; i++) {
    const m = lines[i].match(/^#\s*(\w+):\s*(.*)$/)
    if (!m) break
    frontmatter[m[1].toLowerCase()] = m[2]
  }
  // Skip blank separator lines
  while (i < lines.length && lines[i].trim() === "") i++

  const password = lines[i] ?? ""
  return { frontmatter, password, body: plaintext }
}
