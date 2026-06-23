# Decisions

Deviations from `pash.md` spec, with reasoning. The spec is the source of
truth — anything here is a deliberate trim or change for v0.1.

## v0.1.2: Tree order fix

The walk function used to emit groups _after_ recursing into their
children, then re-sort the whole list by depth. The result was that
all depth-0 rows came first, then all depth-1, then all depth-2 — a
selected group (`social/`) appeared at the top of the list while its
children (`social/instagram`, `social/twitter`) appeared at the
bottom, several screens away. Confusing and broken.

Fix: walk is now a true DFS that pushes the group placeholder
_before_ recursing, then either promotes it to a real row (if the
subtree had any content) or splices it out (empty group). The final
depth-sort is gone — DFS order is preserved naturally. Empty
directories are pruned, matching `pass` CLI behavior.

Side effect: the `groups: Set<string>` collector (used by the spec
for key-id inheritance) is dead code in v0.1 — we don't render
per-group GPG keys yet. Removed; will come back in v0.2 if we
surface key ids in the UI.

## v0.1.1: Preview is opt-in

Shipped after the v0.1 code review. The right pane now has two modes:

- **Collapsed (default):** shows entry path + non-secret frontmatter
  (login, url, email, otpauth, notes) with the password masked as
  `•••••••• (N chars)`. Disambiguation works without exposing plaintext.
- **Expanded (`p` to toggle):** shows the full decrypted body with a
  visible `PREVIEW` chip and a red border.

`Enter` (transient copy) never expands the preview. Plaintext on
screen is always an explicit user action.

Rationale: the preview pane is the largest moment of exposure in the
whole chain. With the transient copy pipeline, the _common_ path is
"find the right entry, copy, paste" — you don't actually need to _see_
the password to do that. The metadata pane gives you the
disambiguation you need; `p` is the explicit "yes, show me the
secret" gate.

## v0.1 dep trims (land in v0.2)

The spec's "Stack" section lists these alongside the core deps. We're
deferring them to v0.2 because v0.1's feature set doesn't need them:

- **`ink-text-input`** — the filter input is 15 lines of `useState` +
  `useInput`. Re-evaluate when the generate wizard lands.
- **`ink-spinner`** — v0.1 has one async action (decrypt preview). A
  text-only "Loading…" beats a spinner for one site.
- **`smol-toml`** — v0.1 has no `config.toml`. Hardcoded defaults are
  fine; revisit when the first user-pref flag is added.
- **`debug`** — v0.1 has no logging to scope. Add when a real bug needs
  tracing.
- **`ink-testing-library`** — manual `npm run demo` against the
  fixture store is the fastest feedback loop for v0.1. Snapshot tests
  land with v0.2 features.

## v0.1 scope cut (the big one)

Per the build discussion, v0.1 ships with: **browse, transient copy,
fuzzy filter, lazy preview, reload, help, quit**. Deferred to v0.2:
generate (`g n`), insert/edit (`i`), delete (`d`), OTP (`t`), key-field
copies (`o`/`u`/`n`), path yank (`y`), and frontmatter parsing.

These are first-class features in the spec; they land in v0.2 once the
core browse/copy loop is validated end-to-end.

## v0.1 layout

We follow the spec's `src/components/`, `src/utils/`, `src/types/`
shape. The spec also lists `src/hooks/` and `src/theme/` — we're
inlining these for v0.1 (filter state lives in `App.tsx`'s reducer,
colors are inline strings in components) and will split them out when a
second consumer appears. This is YAGNI, not a permanent deviation.

## Pinentry

`pass show` will block on GPG pinentry when the agent is empty. v0.1
does nothing clever — the user sees the same macOS prompt they'd see
in a terminal. We trust the GPG agent's default 600s cache TTL. If
this turns out to be painful in practice, v0.2 adds a startup
`gpgconf --reload gpg-agent` and a "warm cache" hint.
