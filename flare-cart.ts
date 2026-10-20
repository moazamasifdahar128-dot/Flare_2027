export type CartLine = { productId: string; qty: number };

const KEY = "flare-cart";

export function readCart(): CartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]") as CartLine[];
    if (!Array.isArray(raw)) return [];
    return raw.filter((line) => line && typeof line.productId === "string" && line.qty > 0).slice(0, 20);
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]) {
  localStorage.setItem(KEY, JSON.stringify(lines.slice(0, 20)));
}

export function addCart(productId: string) {
  const lines = readCart();
  const found = lines.find((line) => line.productId === productId);
  if (found) found.qty = Math.min(9, found.qty + 1);
  else lines.push({ productId, qty: 1 });
  writeCart(lines);
  return lines;
}

export function setQty(productId: string, qty: number) {
  const next = qty < 1
    ? readCart().filter((line) => line.productId !== productId)
    : readCart().map((line) => (line.productId === productId ? { ...line, qty: Math.min(9, qty) } : line));
  writeCart(next);
  return next;
}

export function clearCart() {
  localStorage.removeItem(KEY);
}
