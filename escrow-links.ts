const HOSTS = [
  "drive.google.com",
  "docs.google.com",
  "dropbox.com",
  "wetransfer.com",
  "github.com",
];

export function deliveryLinkOk(value: string) {
  const raw = value.trim();
  if (!raw || raw.length > 400) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return HOSTS.some((item) => host === item || host.endsWith(`.${item}`));
}

export function demoLinkOk(value: string) {
  const raw = value.trim();
  if (!raw) return true;
  if (raw.length > 300) return false;
  try {
    const url = new URL(raw);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function lockHours(kind: string) {
  return kind === "code" ? 48 : 24;
}

export function hostLabel(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host.includes("drive.google") || host.includes("docs.google")) return "Google Drive";
    if (host.includes("dropbox")) return "Dropbox";
    if (host.includes("wetransfer")) return "WeTransfer";
    if (host.includes("github")) return "GitHub";
    return "Live site";
  } catch {
    return "Link";
  }
}
