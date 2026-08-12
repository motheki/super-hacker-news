const HN_POST_LINK_REGEXP =
  /https?(?::|&#x3A;)(?:\/\/|&#x2F;&#x2F;)news\.ycombinator\.com(?:\/|&#x2F;)item\?id=(\d+)/gi;

export const isInternalPath = (value: string) =>
  value.startsWith("/") && !value.startsWith("//");

export const isSafeExternalUrl = (
  value: string | undefined,
): value is string => {
  if (!value) return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

export const replaceHnPostLinks = (text: string) =>
  text.replaceAll(HN_POST_LINK_REGEXP, "/post/$1");
