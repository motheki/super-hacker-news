import { NextResponse, type NextRequest } from "next/server";
import { TOPICS } from "~/lib/topic";

const TOPIC_NAMES = new Set(TOPICS.map(topic => topic.name));
const MAX_USER_NAME_LENGTH = 15;
const notFound = () => new NextResponse("Not found", { status: 404 });

export function proxy(request: NextRequest) {
	const segments = request.nextUrl.pathname.split("/").filter(Boolean);

	if (segments.length === 1 && !segments[0].includes(".") && !TOPIC_NAMES.has(segments[0])) {
		return notFound();
	}

	if (segments[0] === "post") {
		const postId = Number(segments[1]);
		if (segments.length !== 2 || !Number.isSafeInteger(postId) || postId < 1) {
			return notFound();
		}
	}

	if (
		segments[0] === "user" &&
		(segments.length !== 2 || segments[1].length > MAX_USER_NAME_LENGTH)
	) {
		return notFound();
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/:topicName", "/post/:path*", "/user/:path*"],
};
