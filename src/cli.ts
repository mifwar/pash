#!/usr/bin/env node
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import meow from "meow"
import { run } from "./index.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function getVersion(): string {
  try {
    const pkgPath = join(__dirname, "..", "package.json")
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
    return pkg.version
  } catch {
    return "unknown"
  }
}

const cli = meow(
  `
  Usage
    $ pash [path]

  Options
    --store      Override password store root (default: $PASSWORD_STORE_DIR or ~/.password-store)
    --version    Show version
    --help       Show this help

  Key bindings
    j/k          Move selection
    g/G          Top / bottom
    h/l or ←/→   Collapse / expand group
    Enter        Transient-copy password (on entry) / toggle group (on group)
    p            Toggle full-body preview (plaintext on screen)
    /            Filter (fuzzy)
    i            Insert new entry (pass generate)
    Esc          Clear filter / collapse preview / cancel insert
    R            Reload store
    ?            Help
    q            Quit
`,
  {
    importMeta: import.meta,
    flags: {
      store: {
        type: "string",
      },
    },
  }
)

run(cli.flags.store)
