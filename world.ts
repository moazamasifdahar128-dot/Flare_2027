import { COUNTRIES, COUNTRY_CODE, countryFlag } from "./countries";

const DIAL: Record<string, string> = {
  AF: "93", AL: "355", DZ: "213", AD: "376", AO: "244", AG: "1", AR: "54", AM: "374", AU: "61", AT: "43", AZ: "994",
  BS: "1", BH: "973", BD: "880", BB: "1", BY: "375", BE: "32", BZ: "501", BJ: "229", BT: "975", BO: "591", BA: "387", BW: "267", BR: "55", BN: "673", BG: "359", BF: "226", BI: "257",
  CV: "238", KH: "855", CM: "237", CA: "1", CF: "236", TD: "235", CL: "56", CN: "86", CO: "57", KM: "269", CG: "242", CR: "506", CI: "225", HR: "385", CU: "53", CY: "357", CZ: "420",
  DK: "45", DJ: "253", DM: "1", DO: "1", CD: "243",
  EC: "593", EG: "20", SV: "503", GQ: "240", ER: "291", EE: "372", SZ: "268", ET: "251",
  FJ: "679", FI: "358", FR: "33",
  GA: "241", GM: "220", GE: "995", DE: "49", GH: "233", GR: "30", GD: "1", GT: "502", GN: "224", GW: "245", GY: "592",
  HT: "509", HN: "504", HU: "36",
  IS: "354", IN: "91", ID: "62", IR: "98", IQ: "964", IE: "353", IL: "972", IT: "39",
  JM: "1", JP: "81", JO: "962",
  KZ: "7", KE: "254", KI: "686", XK: "383", KW: "965", KG: "996",
  LA: "856", LV: "371", LB: "961", LS: "266", LR: "231", LY: "218", LI: "423", LT: "370", LU: "352",
  MG: "261", MW: "265", MY: "60", MV: "960", ML: "223", MT: "356", MH: "692", MR: "222", MU: "230", MX: "52", FM: "691", MD: "373", MC: "377", MN: "976", ME: "382", MA: "212", MZ: "258", MM: "95",
  NA: "264", NR: "674", NP: "977", NL: "31", NZ: "64", NI: "505", NE: "227", NG: "234", KP: "850", MK: "389", NO: "47",
  OM: "968",
  PK: "92", PW: "680", PS: "970", PA: "507", PG: "675", PY: "595", PE: "51", PH: "63", PL: "48", PT: "351",
  QA: "974",
  RO: "40", RU: "7", RW: "250",
  KN: "1", LC: "1", VC: "1", WS: "685", SM: "378", ST: "239", SA: "966", SN: "221", RS: "381", SC: "248", SL: "232", SG: "65", SK: "421", SI: "386", SB: "677", SO: "252", ZA: "27", KR: "82", SS: "211", ES: "34", LK: "94", SD: "249", SR: "597", SE: "46", CH: "41", SY: "963",
  TW: "886", TJ: "992", TZ: "255", TH: "66", TL: "670", TG: "228", TO: "676", TT: "1", TN: "216", TR: "90", TM: "993", TV: "688",
  UG: "256", UA: "380", AE: "971", GB: "44", US: "1", UY: "598", UZ: "998",
  VU: "678", VA: "379", VE: "58", VN: "84",
  YE: "967",
  ZM: "260", ZW: "263",
};

const AREA: Record<string, string> = {};
function fill(continent: string, codes: string[]) {
  for (const code of codes) AREA[code] = continent;
}
fill("Africa", ["DZ","AO","BJ","BW","BF","BI","CV","CM","CF","TD","KM","CG","CD","CI","DJ","EG","GQ","ER","SZ","ET","GA","GM","GH","GN","GW","KE","LS","LR","LY","MG","MW","ML","MR","MU","MA","MZ","NA","NE","NG","RW","ST","SN","SC","SL","SO","ZA","SS","SD","TZ","TG","TN","UG","ZM","ZW"]);
fill("Asia", ["AF","AM","AZ","BH","BD","BT","BN","KH","CN","CY","GE","IN","ID","IR","IQ","IL","JP","JO","KZ","KW","KG","LA","LB","MY","MV","MN","MM","NP","KP","OM","PK","PS","PH","QA","SA","SG","KR","LK","SY","TW","TJ","TH","TL","TR","TM","AE","UZ","VN","YE"]);
fill("Europe", ["AL","AD","AT","BY","BE","BA","BG","HR","CZ","DK","EE","FI","FR","DE","GR","HU","IS","IE","IT","XK","LV","LI","LT","LU","MT","MD","MC","ME","NL","MK","NO","PL","PT","RO","RU","SM","RS","SK","SI","ES","SE","CH","UA","GB","VA"]);
fill("North America", ["AG","BS","BB","BZ","CA","CR","CU","DM","DO","SV","GD","GT","HT","HN","JM","MX","NI","PA","KN","LC","VC","TT","US"]);
fill("South America", ["AR","BO","BR","CL","CO","EC","GY","PY","PE","SR","UY","VE"]);
fill("Oceania", ["AU","FJ","KI","MH","FM","NR","NZ","PW","PG","WS","SB","TO","TV","VU"]);

const ALIAS: Record<string, string[]> = {
  GB: ["uk", "britain", "england"],
  US: ["usa", "america"],
  AE: ["uae", "dubai", "emirates"],
  SA: ["ksa", "saudia", "saa", "saud"],
  KR: ["korea"],
  KP: ["dprk"],
  CI: ["ivory", "cote"],
  CD: ["drc", "kinshasa"],
  CZ: ["czech"],
  NL: ["holland"],
  TR: ["turkiye"],
  RU: ["russian"],
};

export type BanCountry = {
  code: string;
  name: string;
  flag: string;
  phone: string;
  continent: string;
};

export const WORLD: BanCountry[] = COUNTRIES.map((name) => {
  const code = COUNTRY_CODE[name] ?? "";
  return {
    code,
    name,
    flag: countryFlag(name),
    phone: DIAL[code] ? `+${DIAL[code]}` : "",
    continent: AREA[code] ?? "",
  };
}).sort((a, b) => a.name.localeCompare(b.name));

const BY_CODE = new Map(WORLD.map((row) => [row.code, row]));

export function countryByCode(code: string) {
  return BY_CODE.get(code.toUpperCase()) ?? null;
}

export const BAN_SPANS = [
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 168 },
  { label: "1 month", hours: 720 },
  { label: "3 months", hours: 2160 },
  { label: "Permanent", hours: 0 },
] as const;

export function banCopy(name: string) {
  return `Flare is paused in your country (${name}). This region is currently restricted by founder. Please try later or contact support.`;
}

export function banLeft(until: string | null | undefined, forever: boolean) {
  if (forever || !until) return "Permanent";
  const ms = new Date(until).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "Expired";
  const totalHours = Math.floor(ms / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (totalHours > 0) return `${totalHours}h ${mins}m`;
  return `${Math.max(1, Math.floor(ms / 60_000))}m`;
}

function rankCountry(row: BanCountry, text: string) {
  const name = row.name.toLowerCase();
  const alias = ALIAS[row.code] ?? [];
  if (row.code.toLowerCase() === text || alias.includes(text) || name === text) return 0;
  if (name.startsWith(text) || name.split(/\s+/).some((word) => word.startsWith(text))) return 1;
  const head = name.slice(0, text.length);
  let edits = 0;
  for (let i = 0; i < text.length; i++) if (text[i] !== head[i]) edits += 1;
  if (text.length >= 3 && edits === 1 && name.startsWith(text.slice(0, 2))) return 2;
  if (name.includes(text) || alias.some((item) => item.includes(text))) return 3;
  const folded = text.replace(/(.)\1+/g, "$1");
  if (folded.length >= 2 && folded !== text && (name.startsWith(folded) || name.split(/\s+/).some((word) => word.startsWith(folded)))) return 4;
  if (text.length >= 4 && row.continent.toLowerCase().includes(text)) return 6;
  return 99;
}

export function filterCountries(query: string) {
  const text = query.trim().toLowerCase().replace(/^\+/, "");
  const digits = /^\d+$/.test(text) ? text : "";
  const rows = WORLD.filter((row) => {
    if (!text) return true;
    const phone = row.phone.replace(/\D/g, "");
    if (digits) return phone === digits || phone.startsWith(digits) || (digits.length >= 2 && phone.includes(digits));
    return rankCountry(row, text) < 99;
  });
  rows.sort((a, b) => {
    if (digits) {
      const rank = (phone: string) => (phone === digits ? 0 : phone.startsWith(digits) ? 1 : 2);
      const diff = rank(a.phone.replace(/\D/g, "")) - rank(b.phone.replace(/\D/g, ""));
      if (diff) return diff;
    } else {
      const diff = rankCountry(a, text) - rankCountry(b, text);
      if (diff) return diff;
    }
    return a.name.localeCompare(b.name);
  });
  return rows;
}
