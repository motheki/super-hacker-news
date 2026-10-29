import DOMPurify from "dompurify";
import { replaceHnPostLinks } from "../lib/link";
import { node } from "./ui";
export function richText(html: string) {
  const element = node("div", "", "rich-text");
  element.append(DOMPurify.sanitize(replaceHnPostLinks(html), {
    ALLOWED_TAGS: ["p", "a", "i", "em", "b", "strong", "code", "pre", "blockquote", "ul", "ol", "li", "br"],
    ALLOWED_ATTR: ["href"], ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false,
    RETURN_DOM_FRAGMENT: true,
  }));
  for (const anchor of element.querySelectorAll("a")) anchor.rel = "noreferrer noopener";
  return element;
}
