const FULL = new Set(["US", "GB", "CA", "AU", "DE", "FR", "IT", "ES", "NL", "AE", "SA", "QA", "KW", "OM", "BH"]);
const PARTIAL = new Set(["PK", "IN", "BD", "NP", "LK", "ID", "PH", "VN", "EG", "NG", "KE"]);

export function regionOf(country: string) {
  const code = country.toUpperCase();
  if (FULL.has(code)) return "full" as const;
  if (PARTIAL.has(code)) return "partial" as const;
  return "other" as const;
}
