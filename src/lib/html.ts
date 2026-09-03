import "server-only";
import parseHtml, {
  Comment,
  domToReact,
  Element,
  ProcessingInstruction,
  Text,
  type DOMNode,
  type HTMLReactParserOptions,
} from "html-react-parser";
import Link from "next/link";
import { createElement } from "react";
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

const parserOptions: HTMLReactParserOptions = {
  replace(domNode: Readonly<DOMNode>) {
    if (!(domNode instanceof Element) || domNode.name !== "a") return null;
    const href = domNode.attribs.href;
    if (href === undefined || !isInternalPath(href)) return null;

    const children: DOMNode[] = [];
    for (const child of domNode.children) {
      if (
        child instanceof Comment ||
        child instanceof Element ||
        child instanceof ProcessingInstruction ||
        child instanceof Text
      ) {
        children.push(child);
      }
    }

    return createElement(Link, { href }, domToReact(children, parserOptions));
  },
};

export const renderHnHtml = (html: string) =>
  parseHtml(
    sanitizeHtml(replaceHnPostLinks(html), sanitizeOptions),
    parserOptions,
  );
