export function addServerTiming(
  headers: Headers,
  name: string,
  durationMs: number,
) {
  const duration = Math.round(durationMs * 10) / 10;
  const metric = `${name};dur=${duration}`;
  const previous = headers.get("server-timing");

  headers.set(
    "server-timing",
    previous === null ? metric : `${previous}, ${metric}`,
  );
}
