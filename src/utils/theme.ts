/**
 * Catppuccin Mocha palette, hex strings.
 *
 * Inline these in components as `<Text color="#b4befe">…</Text>`.
 * Mirrors port-patrol's "hardcode colors" approach. v0.2 splits this
 * into a proper `theme/` module if a second consumer needs named
 * tokens.
 */
export const theme = {
  // Base
  base: "#1e1e2e",
  mantle: "#181825",
  crust: "#11111b",

  // Text
  text: "#cdd6f4",
  subtext: "#a6adc8",
  subtext0: "#a6adc8",
  overlay: "#6c7086",

  // Accents
  lavender: "#b4befe",
  blue: "#89b4fa",
  sapphire: "#74c7ec",
  teal: "#94e2d5",
  green: "#a6e3a1",
  yellow: "#f9e2af",
  peach: "#fab387",
  maroon: "#eba0ac",
  red: "#f38ba8",
  mauve: "#cba6f7",
  pink: "#f5c2e7",
  flamingo: "#f2cdcd",
  rosewater: "#f5e0dc",

  // Surface
  surface0: "#313244",
  surface1: "#45475a",
  surface2: "#585b70",
} as const
