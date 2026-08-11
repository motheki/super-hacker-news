import { expect, test } from "bun:test";
import { serializeJsonLd } from "./JsonLd";

test("serializeJsonLd prevents an embedded closing script tag", () => {
	const result = serializeJsonLd({ headline: "</script><script>alert(1)</script>" });

	expect(result).not.toContain("<");
	expect(result).toContain("\\u003c/script>");
});
