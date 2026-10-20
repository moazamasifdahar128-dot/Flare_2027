export function openClipSlot(used: readonly number[]) {
  if (!used.includes(0)) return 0;
  if (!used.includes(1)) return 1;
  return -1;
}
