/* ============================================================
   Biomate — Home

   Follows the Figma: wordmark, a greeting, the watercolour Australia
   with state pills, then a stack of activity cards that fade out
   downward — implying more below without a scrollbar.

   The fade is decorative only. Every card in it is a real, focusable
   link at full opacity to assistive tech; the gradient is applied to
   a wrapper, not to the content's own colour, so nothing is actually
   hidden from anyone.
   ============================================================ */

import { DB } from "../db.js";
import { el, avatar, timeAgo, fmtShortDate } from "../ui.js";
import { icon } from "../icons.js";
import { ausMap } from "../ausmap.js";
import { go } from "../router.js";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export async function home() {
  const meId = DB.uid();
  const [me, hikes, members, messages, profiles] = await Promise.all([
    DB.me(),
    DB.list("hikes", { filter: { status: "open" } }),
    DB.list("hike_members"),
    DB.list("messages"),
    DB.list("profiles"),
  ]);

  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const myHikes = new Set(members.filter((m) => m.user_id === meId && m.status !== "left").map((m) => m.hike_id));

  const counts = {};
  hikes.forEach((h) => { counts[h.region] = (counts[h.region] || 0) + 1; });

  const wrap = el("div");

  /* ---- brand ---- */
  wrap.append(
    el("div", { class: "brandbar" }, [
      el("span", { class: "brandmark", html: logoMark() }),
      el("span", { class: "brandword", text: "Biomate" }),
    ]),
    el("p", { class: "hello" }, [
      el("em", { text: `${greeting()}, ${(me && me.display_name) || "friend"}` }),
      el("span", { text: "Where would you like to explore today?" }),
    ])
  );

  /* ---- the map ---- */
  wrap.append(ausMap((code) => go(`region/${code}`), counts));

  /* ---- activity stack ---- */
  const feed = [];

  myHikes.forEach((id) => {
    const h = hikes.find((x) => x.id === id);
    if (!h) return;
    const last = messages.filter((m) => m.hike_id === id).sort((a, b) => a.created_at < b.created_at ? 1 : -1)[0];
    if (last) {
      const who = byId[last.user_id];
      feed.push({
        to: `chat/${id}`,
        title: `[${(who && who.display_name) || "someone"}]`,
        body: last.body,
        when: last.created_at,
      });
    }
  });

  const joinedCount = members.filter((m) => myHikes.has(m.hike_id) && m.user_id !== meId).length;
  if (joinedCount) {
    feed.push({
      to: "messages",
      title: "[Your hikes]",
      body: `${joinedCount} ${joinedCount === 1 ? "person is" : "people are"} walking with you`,
    });
  }
  feed.push({
    to: "matchmaker",
    title: "",
    body: `New hikes happening near ${(me && me.home_area) || "Melbourne"}…`,
  });
  feed.push({ to: "profile", title: "", body: "See everything you've walked so far!" });

  const stack = el("div", { class: "fadestack" },
    feed.slice(0, 4).map((f, i) =>
      el("button", {
        class: "fadestack__row",
        type: "button",
        style: `--i:${i}`,
        onclick: () => go(f.to),
      }, [
        el("span", {}, [
          f.title ? el("em", { text: f.title + " " }) : null,
          el("span", { text: f.body }),
        ]),
        f.when ? el("span", { class: "tiny", text: timeAgo(f.when) }) : null,
      ])
    )
  );
  wrap.append(stack);

  /* ---- next hike, if there is one ---- */
  const next = hikes
    .filter((h) => myHikes.has(h.id) && h.proposed_date)
    .sort((a, b) => (a.proposed_date < b.proposed_date ? -1 : 1))[0];

  if (next) {
    wrap.append(
      el("div", { class: "stack", style: "margin-top:18px" }, [
        el("p", { class: "tiny", style: "padding:0 2px", text: "COMING UP" }),
        el("button", { class: "row", type: "button", onclick: () => go(`hike/${next.id}`) }, [
          avatar((byId[next.host_id] || {}).avatar_url, (byId[next.host_id] || {}).display_name),
          el("span", { class: "row__body" }, [
            el("span", { class: "row__title", text: next.title.split("—")[0].trim() }),
            el("span", { class: "row__sub", text: `${fmtShortDate(next.proposed_date)} · ${next.location_name || next.region}` }),
          ]),
          el("span", { class: "iconbtn", html: icon("arrow", { size: 20 }) }),
        ]),
      ])
    );
  }

  return wrap;
}

/* the mark from the Figma: a ringed circle holding a trail line with
   three waypoint dots — terracotta, amber, forest */
function logoMark() {
  return `<svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true" focusable="false">
    <circle cx="24" cy="24" r="21" fill="var(--cream)" stroke="var(--brand-text)" stroke-width="3.2"/>
    <path d="M14 32 Q20 30 24 24 Q28 18 34 16" fill="none" stroke="var(--ink-soft)" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="14" cy="32" r="4.4" fill="var(--brand)"/>
    <circle cx="24" cy="24" r="4.4" fill="var(--amber)"/>
    <circle cx="34" cy="16" r="4.4" fill="var(--forest)"/>
  </svg>`;
}
