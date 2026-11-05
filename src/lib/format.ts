const TIME_ZONE = "Asia/Jakarta";

const decimal = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const relative = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });
const shortDate = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});
const hourOnly = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});

/** 1288490 → "1,2 MB" */
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${decimal.format(value)} ${units[unit]}`;
}

/** "2 jam yang lalu", "kemarin", lalu tanggal pendek setelah seminggu. */
export function formatRelative(iso: string, now: Date) {
  const seconds = (new Date(iso).getTime() - now.getTime()) / 1000;
  const abs = Math.abs(seconds);
  if (abs < 60) return "baru saja";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 7) return relative.format(Math.round(seconds / 86400), "day");
  return shortDate.format(new Date(iso));
}

/** Sapaan sesuai jam di Indonesia bagian barat. */
export function getGreeting(now: Date) {
  const hour = Number(hourOnly.format(now));
  if (hour >= 4 && hour < 11) return "Selamat pagi";
  if (hour >= 11 && hour < 15) return "Selamat siang";
  if (hour >= 15 && hour < 18) return "Selamat sore";
  return "Selamat malam";
}

const timeOnly = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

/** "5 Nov 2026" */
export function formatDate(iso: string) {
  return shortDate.format(new Date(iso));
}

/** "14.30" (WIB) */
export function formatTime(iso: string) {
  return timeOnly.format(new Date(iso));
}
