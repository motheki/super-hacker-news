export const serializeJsonLd = (value: unknown) =>
  JSON.stringify(value).replaceAll("<", "\\u003c");

export function JsonLd({ value }: Readonly<{ value: unknown }>) {
  return <script type="application/ld+json">{serializeJsonLd(value)}</script>;
}
