import "server-only";
import parseHtml, {
	domToReact,
	Element,
	type DOMNode,
	type HTMLReactParserOptions,
} from "html-react-parser";
import type { Route } from "next";
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
		a: (tagName, attributes) => ({
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
	replace(domNode) {
		if (!(domNode instanceof Element) || domNode.name !== "a") return;
		const href = domNode.attribs.href;
		if (!href || !isInternalPath(href)) return;

		return createElement(
			Link,
			{ href: href as Route, transitionTypes: ["nav-forward"] },
			domToReact(domNode.children as DOMNode[], parserOptions),
		);
	},
};

export const renderHnHtml = (html: string) =>
	parseHtml(sanitizeHtml(replaceHnPostLinks(html), sanitizeOptions), parserOptions);
