#!/usr/bin/env node
import meow from "meow"
import { run } from "./index.js"
import { KEYMAP } from "./keymap.js"

const cli = meow(
  `
  Usage
    $ pash [path]

  Options
    --store      Override password store root (default: $PASSWORD_STORE_DIR or ~/.password-store)
    --version    Show version
    --help       Show this help

  Key bindings
${KEYMAP.map((b) => `    ${b.label.padEnd(13)}${b.description}`).join("\n")}
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

run(cli.flags.store ?? cli.input[0])
