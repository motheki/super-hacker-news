import { browserClient } from "./hn-client";
import { toComment, type OfficialItem } from "../lib/hacker-news/codec";
import type { Comment, CommentPage } from "../lib/post";
import { node, link } from "./ui";
import { richText } from "./rich-text";

function threadControl(id: number, page: number, label: string) {
  const control = node("div");
  control.dataset.threadControl = "";
  const button = node("button", label);
  button.type = "button";
  button.dataset.loadThread = String(id);
  button.dataset.page = String(page);
  const status = node("span", "", "meta");
  status.setAttribute("role", "status");
  control.append(button, status);
  return control;
}
export function renderComment(comment: Comment, showReplies = true) {
  const article = node("article", "", "comment");
  article.id = `comment-${comment.id}`;
  const details = node("details"); details.open = true;
  const summary = node("summary", "", "comment-info");
  if (comment.user) summary.append(link(comment.user, `/user?name=${encodeURIComponent(comment.user)}`), " ");
  summary.append(link(comment.time_ago ?? "permalink", `/thread?id=${comment.id}`));
  if (comment.parent) summary.append(" | ", link("parent", `/item?id=${comment.parent}`));
  summary.append(" | ", node("span", "[+]", "closed-label"), node("span", "[–]", "open-label"));
  const content = node("div", "", "comment-content");
  if (comment.content) content.append(richText(comment.content));
  if (comment.deleted || comment.dead) content.append(node("p", comment.deleted ? "[deleted]" : "[dead]", "faint"));
  details.append(summary, content);
  if (showReplies && comment.replyCount > 0) {
    const replies = node("div", "", "replies");
    replies.append(threadControl(comment.id, 1, `Show ${comment.replyCount} ${comment.replyCount === 1 ? "reply" : "replies"}`));
    details.append(replies);
  }
  article.append(details);
  return article;
}
function renderComments(id: number, discussion: CommentPage) {
  const result = node("div"); result.dataset.threadPage = ""; result.tabIndex = -1;
  result.append(...discussion.comments.map((comment) => renderComment(comment)));
  if (discussion.nextPage !== null) result.append(threadControl(id, discussion.nextPage, "More comments…"));
  if (!discussion.comments.length && discussion.nextPage === null) result.append(node("p", "No comments to show.", "meta"));
  return result;
}
export async function loadComments(id: number, page: number, parent?: OfficialItem) {
  const client = browserClient();
  const item = parent ?? await client.getItem(id);
  if (!item || !["story", "job", "poll", "comment"].includes(item.type)) throw new Error("Discussion not found");
  const discussion = await client.getComments(item, page);
  if (!discussion) throw new Error("Comment page not found");
  return renderComments(id, discussion);
}
export function discussionSection(id: number) {
  const section = node("section"); section.id = "comments"; section.dataset.commentsId = String(id);
  section.setAttribute("aria-label", "Comments");
  const button = node("button", "Load comments"); button.type = "button"; button.dataset.loadComments = "";
  const status = node("p", "", "meta"); status.setAttribute("role", "status");
  const list = node("div"); list.dataset.commentsList = "";
  section.append(node("h2", "Comments"), button, status, list);
  return section;
}
export function mountDiscussion(section: HTMLElement, parent?: OfficialItem, page = 1) {
  const button = section.querySelector<HTMLButtonElement>("[data-load-comments]")!;
  const status = section.querySelector<HTMLElement>('[role="status"]')!;
  const list = section.querySelector<HTMLElement>("[data-comments-list]")!;
  button.hidden = false;
  let busy = false;
  const load = async () => {
    if (busy) return;
    busy = true; button.disabled = true; status.textContent = "Loading comments…";
    try {
      const content = await loadComments(Number(section.dataset.commentsId), page, parent);
      list.replaceChildren(content); status.textContent = ""; button.textContent = "Refresh comments";
      parent = undefined; // Further refreshes retrieve the current child IDs.
    } catch { status.textContent = "Could not load comments. Try again or read the discussion on Hacker News."; }
    finally { busy = false; button.disabled = false; }
  };
  button.addEventListener("click", () => { observer?.disconnect(); void load(); });
  const observer = typeof IntersectionObserver === "undefined" ? undefined : new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) { observer!.disconnect(); void load(); }
  });
  observer?.observe(section);
}

document.addEventListener("click", async (event) => {
  const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-load-thread]") : null;
  const control = button?.closest<HTMLElement>("[data-thread-control]");
  if (!button || !control || button.disabled) return;
  const status = control.querySelector<HTMLElement>('[role="status"]')!;
  button.disabled = true; status.textContent = " Loading…";
  try {
    const content = await loadComments(Number(button.dataset.loadThread), Number(button.dataset.page));
    const focus = document.activeElement === button;
    control.replaceWith(content);
    if (focus) content.focus({ preventScroll: true });
  } catch { status.textContent = " Could not load replies. Try again."; }
  finally { button.disabled = false; }
});
for (const section of document.querySelectorAll<HTMLElement>("[data-comments-id]")) mountDiscussion(section);
export function parentComment(item: OfficialItem) { return renderComment(toComment(item, Math.floor(Date.now() / 1000)), false); }
