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
import { createElement } from "react";
import sanitizeHtml from "sanitize-html";
import { IntentPrefetchLink } from "~/components/IntentPrefetchLink";
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
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Parser callbacks receive mutable third-party DOM classes.
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

    return createElement(
      IntentPrefetchLink,
      { href },
      domToReact(children, parserOptions),
    );
  },
};

export const renderHnHtml = (html: string) =>
  parseHtml(
    sanitizeHtml(replaceHnPostLinks(html), sanitizeOptions),
    parserOptions,
  );
