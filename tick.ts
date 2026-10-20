export type TickState = "none" | "active" | "faded";

export function tickOpacity(views: number) {
  if (views >= 5_000) return 1;
  const raw = views / 5_000;
  return Math.round(Math.max(0.2, Math.min(1, raw)) * 100) / 100;
}

/** A granted tick stays. Views and the old 30-day fade never take it away. */
export function nextTick(state: TickState, _views = 0, _fadedDays = 0, _editGrace = false): TickState {
  if (state === "none") return "none";
  return "active";
}
