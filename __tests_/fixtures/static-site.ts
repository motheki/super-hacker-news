import { STORY } from "./hacker-news";
export const fixtureData: Record<string, unknown> = {
  topstories: [1, ...Array.from({ length: 35 }, (_, i) => 100 + i)],
  newstories: [1], askstories: [1], showstories: [1],
  "item/1": { ...STORY, descendants: 26, kids: Array.from({ length: 25 }, (_, i) => i + 2) },
  "item/8863": { ...STORY, id: 8863, title: "An archived story", kids: [], descendants: 0 },
  "user/alice": { id: "alice", created: 1_600_000_000, karma: 42, about: '<p>Hello <b>world</b><img src=x onerror="window.__xss=1"><a href="javascript:alert(1)">unsafe</a></p>' },
};
for (let i = 100; i < 135; i++) fixtureData[`item/${i}`] = { ...STORY, id: i, title: `Static story ${i}`, kids: [], descendants: 0 };
for (let i = 2; i < 27; i++) fixtureData[`item/${i}`] = {
  id: i, type: "comment", parent: 1, by: "alice", time: STORY.time,
  text: `<p>Comment ${i} <script>window.__xss=1</script><img src=x onerror="window.__xss=1"><a href="javascript:alert(1)">unsafe</a></p>`,
  ...(i === 2 ? { kids: [50] } : {}),
  ...(i === 3 ? { deleted: true, kids: [51] } : {}),
};
fixtureData["item/50"] = { id: 50, type: "comment", parent: 2, by: "bob", text: "<p>Nested reply</p>", time: STORY.time };
fixtureData["item/51"] = { id: 51, type: "comment", parent: 3, by: "bob", text: "<p>Reply to deleted parent</p>", time: STORY.time };
