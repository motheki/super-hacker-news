const HN_POST_LINK_REGEXP =
	/https?(?::|&#x3A;)(?:\/\/|&#x2F;&#x2F;)news\.ycombinator\.com(?:\/|&#x2F;)item\?id=(\d+)/gi;

export const replaceHnPostLinks = (text: string) =>
	text.replaceAll(HN_POST_LINK_REGEXP, "/post/$1");
