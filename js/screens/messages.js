/* ============================================================
   Biomate — All Messages (the conversation list)

   Follows the Figma: "Current activities" holds the group threads
   with a stacked overlapping avatar cluster, then the rest below.
   Ends on an invitation rather than dead space, because an empty
   tail on a social app reads as failure.
   ============================================================ */

import { DB } from "../db.js";
import { el, avatar, timeAgo } from "../ui.js";
import { icon } from "../icons.js";
import { go, back } from "../router.js";

export async function messages() {
  const meId = DB.uid();
  const [members, hikes, msgs, profiles] = await Promise.all([
    DB.list("hike_members"),
    DB.list("hikes"),
    DB.list("messages"),
    DB.list("profiles"),
  ]);

  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const hikeById = Object.fromEntries(hikes.map((h) => [h.id, h]));
  const mine = members.filter((m) => m.user_id === meId && m.status !== "left");

  const threads = mine.map((m) => {
    const h = hikeById[m.hike_id];
    if (!h) return null;
    const thread = msgs.filter((x) => x.hike_id === m.hike_id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const others = members.filter((x) => x.hike_id === m.hike_id && x.status !== "left" && x.user_id !== meId);
    return { hike: h, last: thread[0], others };
  }).filter(Boolean)
    .sort((a, b) => {
      const at = a.last ? a.last.created_at : "";
      const bt = b.last ? b.last.created_at : "";
      return at < bt ? 1 : -1;
    });

  const wrap = el("div");

  wrap.append(
    el("div", { class: "topbar" }, [
      el("button", { class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back", html: icon("back", { size: 20 }), onclick: back }),
      el("h1", { class: "display", text: "All Messages" }),
      avatar((byId[meId] || {}).avatar_url, "You"),
    ])
  );

  if (!threads.length) {
    wrap.append(
      el("div", { class: "stack", style: "padding-top:40px;text-align:center" }, [
        el("p", { class: "display", style: "font-size:1.3rem", text: "No conversations yet" }),
        el("p", { class: "meta", text: "Join a hike and you'll land straight in its group chat." }),
        el("button", { class: "btn btn--primary", style: "margin-top:8px", type: "button", text: "Find a hike", onclick: () => go("matchmaker") }),
      ])
    );
    return wrap;
  }

  const active = threads.filter((t) => t.last);
  const quiet = threads.filter((t) => !t.last);

  if (active.length) {
    wrap.append(el("h2", { class: "sectionhead", text: "Current activities" }));
    wrap.append(el("div", { class: "stack" }, active.map((t) => threadRow(t, byId, meId))));
  }
  if (quiet.length) {
    wrap.append(el("h2", { class: "sectionhead", text: "Nothing said yet" }));
    wrap.append(el("div", { class: "stack" }, quiet.map((t) => threadRow(t, byId, meId))));
  }

  wrap.append(
    el("p", { class: "meta", style: "text-align:center;padding:28px 20px 0;font-style:italic" }, [
      el("button", {
        class: "linky", type: "button", text: "Start more conversations!",
        onclick: () => go("matchmaker"),
      }),
    ])
  );

  return wrap;
}

function threadRow(t, byId, meId) {
  const who = t.last ? byId[t.last.user_id] : null;
  const people = t.others.slice(0, 3);

  return el("button", { class: "row", type: "button", onclick: () => go(`chat/${t.hike.id}`) }, [
    el("span", { class: "avstack" },
      people.length
        ? people.map((m) => avatar((byId[m.user_id] || {}).avatar_url, (byId[m.user_id] || {}).display_name || "?"))
        : [avatar(null, t.hike.title)]),
    el("span", { class: "row__body" }, [
      el("span", { class: "row__title", text: t.hike.title.split("—")[0].trim() }),
      el("span", {
        class: "row__sub",
        text: t.last
          ? (t.last.kind === "system"
              ? t.last.body
              : `${who && who.id === meId ? "You" : (who ? who.display_name : "someone")}: ${t.last.body}`)
          : "No messages yet — say hello",
      }),
    ]),
    t.last ? el("span", { class: "tiny", text: timeAgo(t.last.created_at) }) : null,
  ]);
}
