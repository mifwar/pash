#!/usr/bin/env node
import React from "react"
import { render } from "ink"
import { App } from "./App.js"
import { resolveStoreRoot } from "./utils/xdg.js"
import { enterAltScreen } from "./utils/screen.js"

export function run(storeRoot?: string) {
  const root = storeRoot ?? resolveStoreRoot()
  const { stdout, restore } = enterAltScreen(process.stdout)

  const { unmount, waitUntilExit } = render(
    <App
      onExit={() => {
        unmount()
        restore()
        process.exit(0)
      }}
      storeRoot={root}
    />,
    { stdout }
  )

  waitUntilExit()
    .catch(() => {})
    .finally(restore)
}
