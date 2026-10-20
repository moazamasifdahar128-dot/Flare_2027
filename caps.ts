export const GIG_MAX = 3;
export const BOARD_MAX = 5;
export const GIG_CAP = GIG_MAX;
export const REQUEST_CAP = BOARD_MAX;
export const TICK_GIG_VIEWS = 5_000;
export const TICK_FLOOR_VIEWS = 2_000;

export function overActiveCap(active: number, cap: number) {
  return active >= cap;
}
