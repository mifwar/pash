const ALT_SCREEN_ENTER = "\x1b[?1049h\x1b[?25l\x1b[2J\x1b[H"
const ALT_SCREEN_EXIT = "\x1b[?25h\x1b[?1049l"
const SYNC_START = "\x1b[?2026h"
const SYNC_END = "\x1b[?2026l"

// Ink 5 writes `ansiEscapes.clearTerminal + output` whenever outputHeight >= stdout.rows.
// Clearing the whole terminal before redrawing causes visible flicker on every keypress.
const CLEAR_TERMINAL_PREFIX = /^\x1b\[2J(?:\x1b\[3J)?\x1b\[(?:H|0f)/

/**
 * Rewrite an Ink full-screen clear+redraw chunk into an in-place home+erase-to-EOL
 * update wrapped in DEC Mode 2026 synchronized output so terminals paint atomically.
 */
export function transformFrame(chunk: string): string {
  if (!chunk) return chunk
  if (CLEAR_TERMINAL_PREFIX.test(chunk)) {
    const body = chunk.replace(CLEAR_TERMINAL_PREFIX, "")
    const patched = body.replaceAll("\n", "\x1b[K\n")
    return `${SYNC_START}\x1b[H${patched}\x1b[K\x1b[J${SYNC_END}`
  }
  return `${SYNC_START}${chunk}${SYNC_END}`
}

/**
 * Enter the alternate screen buffer and return a proxied stdout that
 * wraps Ink frames in synchronized output without full-screen flashes,
 * plus an idempotent `restore` callback.
 */
export function enterAltScreen(stream: NodeJS.WriteStream): {
  stdout: NodeJS.WriteStream
  restore: () => void
} {
  if (!stream.isTTY) {
    return { stdout: stream, restore: () => {} }
  }

  stream.write(ALT_SCREEN_ENTER)

  let restored = false
  const restore = () => {
    if (restored) return
    restored = true
    stream.write(ALT_SCREEN_EXIT)
  }

  process.once("exit", restore)

  const stdout = new Proxy(stream, {
    get(target, prop) {
      if (prop === "write") {
        return (
          chunk: string | Uint8Array,
          encodingOrCb?: BufferEncoding | ((err?: Error | null) => void),
          cb?: (err?: Error | null) => void
        ) => {
          const out = typeof chunk === "string" ? transformFrame(chunk) : chunk
          if (typeof encodingOrCb === "function") {
            return target.write(out, encodingOrCb)
          }
          if (encodingOrCb !== undefined) {
            return target.write(out, encodingOrCb, cb)
          }
          return target.write(out)
        }
      }
      const value = Reflect.get(target, prop, target)
      return typeof value === "function" ? value.bind(target) : value
    },
  })

  return { stdout, restore }
}
