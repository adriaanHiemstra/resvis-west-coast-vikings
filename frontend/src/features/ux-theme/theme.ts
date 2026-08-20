// Colours mirrored from tailwind.config.js, for when a raw value
// is needed instead of a Tailwind class. Keep in sync with
// tailwind.config.js `theme.extend.colors`.
export const palette = {
  ink: "#17251f",
  paper: "#f6f4ed",
  warm: "#fffdf7",
  forest: "#154a3b",
  forestLight: "#286451",
  teal: "#177d78",
  lime: "#d8f178",
  line: "#cad0c3",
  muted: "#69756d",
  danger: "#b33c2f",
  dangerSoft: "#fff0ec",
  dangerText: "#8d3327",
  successSoft: "#e9f6df",
} as const;

export type Verdict = boolean | null;

export function verdictLabel(verdict: Verdict): string {
  if (verdict === true) return "Proven";
  if (verdict === false) return "Refuted";
  return "Indeterminate";
}

export function verdictTone(verdict: Verdict): "success" | "danger" | "muted" {
  if (verdict === true) return "danger"; // contradiction found -> the disproving step is highlighted red, per Backlog 4 DoD
  if (verdict === false) return "success";
  return "muted";
}
