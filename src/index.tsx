#!/usr/bin/env node
import React from "react"
import { render } from "ink"
import { App } from "./App.js"
import { resolveStoreRoot } from "./utils/xdg.js"

export function run(storeRoot?: string) {
  const root = storeRoot ?? resolveStoreRoot()

  const { unmount, waitUntilExit } = render(
    <App
      onExit={() => {
        unmount()
        process.exit(0)
      }}
      storeRoot={root}
    />
  )

  waitUntilExit().catch(() => {})
}
