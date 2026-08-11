import "server-only";
import parseHtml from "html-react-parser";
import sanitizeHtml from "sanitize-html";
import { replaceHnPostLinks } from "~/lib/link";

const options: sanitizeHtml.IOptions = {
	allowedAttributes: {
		a: ["href", "rel"],
	},
	allowedSchemes: ["http", "https", "mailto"],
	transformTags: {
		a: (tagName, attributes) => ({
			tagName,
			attribs: {
				...attributes,
				...(attributes.href?.startsWith("/") ? {} : { rel: "noreferrer noopener" }),
			},
		}),
	},
};

export const renderHnHtml = (html: string) =>
	parseHtml(sanitizeHtml(replaceHnPostLinks(html), options));
