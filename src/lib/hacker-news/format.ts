const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_MONTH = 2_592_000;
const SECONDS_PER_YEAR = 31_536_000;

export function formatAge(time: number, now: number) {
  const age = Math.max(0, now - time);
  const units = [
    [SECONDS_PER_YEAR, "year"],
    [SECONDS_PER_MONTH, "month"],
    [SECONDS_PER_DAY, "day"],
    [SECONDS_PER_HOUR, "hour"],
    [SECONDS_PER_MINUTE, "minute"],
  ] as const;

  for (const [seconds, label] of units) {
    if (age < seconds) continue;

    const count = Math.floor(age / seconds);
    return `${count} ${label}${count === 1 ? "" : "s"} ago`;
  }

  return `${age} second${age === 1 ? "" : "s"} ago`;
}

export function getDomain(url: string | undefined) {
  if (url === undefined) return undefined;

  try {
    return new URL(url).hostname.replace(/^www\./u, "");
  } catch {
    return undefined;
  }
}
