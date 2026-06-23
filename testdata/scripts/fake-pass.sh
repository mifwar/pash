#!/usr/bin/env bash
# Fake `pass` binary for `npm run demo`. Prints the .gpg file's
# plaintext contents without invoking GPG.
#
# Usage: fake-pass.sh show <entry-path>
# Looks for testdata/store/<entry-path>.gpg and cats it.
set -euo pipefail

STORE_DIR="${PASH_FAKE_STORE:-$PWD/testdata/store}"

cmd="${1:-}"
shift || true

case "$cmd" in
  show)
    entry="${1:?entry required}"
    path="$STORE_DIR/${entry}.gpg"
    if [[ -f "$path" ]]; then
      cat "$path"
    else
      echo "fake-pass: entry not found: $entry" >&2
      exit 1
    fi
    ;;
  "")
    # `pass` with no args lists the tree — pash doesn't use this in v0.1
    find "$STORE_DIR" -name '*.gpg' -type f | sed "s|$STORE_DIR/||; s|\.gpg$||" | sort
    ;;
  *)
    echo "fake-pass: unsupported command: $cmd" >&2
    exit 2
    ;;
esac
