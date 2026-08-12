import { NextResponse } from "next/server";
import {
  isTopicName,
  isValidUserName,
  parsePage,
  parsePostId,
} from "~/lib/route";

const FRAMEWORK_ROUTES = new Set(["opengraph-image"]);
const notFound = () => new NextResponse("Not found", { status: 404 });

interface ProxyRequest {
  readonly nextUrl: Readonly<{
    pathname: string;
    searchParams: Readonly<{ getAll: (name: string) => string[] }>;
  }>;
}

export function proxy(request: ProxyRequest) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);

  if (
    segments.length === 1 &&
    !segments[0].includes(".") &&
    !FRAMEWORK_ROUTES.has(segments[0]) &&
    !isTopicName(segments[0])
  ) {
    return notFound();
  }

  if (
    segments.length === 1 &&
    isTopicName(segments[0]) &&
    parsePage(request.nextUrl.searchParams.getAll("page")) === null
  ) {
    return notFound();
  }

  if (
    segments[0] === "post" &&
    (segments.length !== 2 || parsePostId(segments[1] ?? "") === null)
  ) {
    return notFound();
  }

  if (
    segments[0] === "user" &&
    (segments.length !== 2 || !isValidUserName(segments[1] ?? ""))
  ) {
    return notFound();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:topicName", "/post/:path*", "/user/:path*"],
};
