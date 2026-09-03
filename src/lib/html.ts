import sanitizeHtml from "sanitize-html";
import { isInternalPath, replaceHnPostLinks } from "~/lib/link";

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

export const sanitizeHnHtml = (html: string) =>
  sanitizeHtml(replaceHnPostLinks(html), sanitizeOptions);
