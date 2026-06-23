import { execFile } from "child_process"
import { promisify } from "util"

const execFileP = promisify(execFile)

/**
 * Resolve the user's `passc` binary.
 *
 * Order:
 * 1. $PASH_PASSC (test hook / explicit override)
 * 2. `passc` on $PATH
 *
 * Returns null if neither is found. Caller should degrade to direct
 * `tc` invocation (v0.2 — for now we just toast a warning).
 */
export async function resolvePassc(): Promise<string | null> {
  if (process.env.PASH_PASSC) return process.env.PASH_PASSC

  try {
    const { stdout } = await execFileP("which", ["passc"])
    const found = stdout.trim()
    return found || null
  } catch {
    return null
  }
}

export type CopyResult = {
  ok: boolean
  /** Seconds until the pasteboard auto-clears, if reported. */
  clearIn: number | null
  /** Error message on failure. */
  error?: string
}

/**
 * Run `passc <entry>` and parse the "Will clear in N seconds" line
 * from stdout for the toast.
 *
 * The passc wrapper decrypts via `pass show` and pushes to the
 * transient pasteboard via `tc`. We never see the plaintext in pash
 * — that's the whole point.
 */
export async function transientCopy(passcBin: string, entryPath: string): Promise<CopyResult> {
  try {
    const { stdout } = await execFileP(passcBin, [entryPath])
    const match = stdout.match(/Will clear in (\d+) seconds/)
    const clearIn = match?.[1] ? parseInt(match[1], 10) : null
    return { ok: true, clearIn }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, clearIn: null, error: message }
  }
}
