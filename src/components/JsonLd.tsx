export const serializeJsonLd = (value: unknown) =>
  JSON.stringify(value).replaceAll("<", "\\u003c");

export function JsonLd({ value }: { value: unknown }) {
  return <script type="application/ld+json">{serializeJsonLd(value)}</script>;
}
