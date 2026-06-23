#!/usr/bin/env bash
# Fake `passc` binary for `npm run demo`. Mimics the user's
# ~/code/dotfiles/bin/passc output: prints a "Copied …" status line
# with a clear-in-N-seconds hint, without actually copying anything.
set -euo pipefail

entry="${1:?entry required}"
echo "Copied password for ${entry}"
echo "Will clear in 45 seconds"
