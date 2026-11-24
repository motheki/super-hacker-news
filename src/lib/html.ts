import sanitizeHtml from "sanitize-html";
import { type CodeBlock, describeCode } from "~/lib/code";
import { isInternalPath, replaceHnPostLinks } from "~/lib/link";

export type RichTextSegment =
  | { readonly kind: "html"; readonly html: string }
  | ({ readonly kind: "code" } & CodeBlock);

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedAttributes: {
    a: ["href", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: (tagName, attributes: Readonly<Record<string, string>>) => ({
      tagName,
      attribs: {
        ...attributes,
        ...(attributes.href && isInternalPath(attributes.href)
          ? {}
          : { rel: "noreferrer noopener" }),
      },
    }),
  },
};

// The sanitizer normalizes Hacker News code blocks to exactly this shape and
// escapes any literal "<" inside them, so the match cannot end early.
const CODE_BLOCK_REGEXP = /<pre><code>([\s\S]*?)<\/code><\/pre>/gu;
const TAG_REGEXP = /<[^>]*>/gu;
const ENTITIES: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&gt;": ">",
  "&lt;": "<",
  "&quot;": '"',
};

/** Recover source text from sanitized markup; the highlighter re-escapes it. */
const toPlainText = (html: string) =>
  html
    .replaceAll(TAG_REGEXP, "")
    .replaceAll(/&(?:amp|gt|lt|quot);/gu, (entity) => ENTITIES[entity] ?? entity);

/** Sanitize Hacker News markup and separate its code blocks from its prose. */
export function parseHnHtml(html: string): RichTextSegment[] {
  const sanitized = sanitizeHtml(replaceHnPostLinks(html), sanitizeOptions);
  const segments: RichTextSegment[] = [];
  const addHtml = (value: string) => {
    if (value.trim().length > 0) segments.push({ kind: "html", html: value });
  };

  let offset = 0;
  for (const match of sanitized.matchAll(CODE_BLOCK_REGEXP)) {
    addHtml(sanitized.slice(offset, match.index));
    const block = describeCode(toPlainText(match[1] ?? ""));
    if (block.code.length > 0) segments.push({ kind: "code", ...block });
    offset = match.index + match[0].length;
  }
  addHtml(sanitized.slice(offset));

  return segments;
}
