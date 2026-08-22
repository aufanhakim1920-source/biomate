/* ============================================================
   Biomate — somebody else's profile

   Aufan: "clicking profile on people directed to their profile".

   Everything here is public by design — profiles, memberships, trail
   logs and the derived stats view all allow anonymous read. Nothing
   private leaks: swipes are readable only by their owner, and chat
   only by members of that hike.
   ============================================================ */

import { DB } from "../db.js";
import { el, avatar, fmtDistance, fmtDuration, fmtShortDate, difficultyLabel, toast } from "../ui.js";
import { icon } from "../icons.js";
import { levelFor } from "../levels.js";
import { say } from "../a11y.js";
import { go, back } from "../router.js";
import { gallery } from "../gallery.js";
import { landscape } from "../art.js";

const EXPERIENCE_LABEL = {
  beginner: "New to this",
  intermediate: "Comfortable on a long day",
  "thru-hiker": "Thru-hiker",
};

export async function person({ id }) {
  const meId = DB.uid();
  if (!id || id === meId) { go("profile"); return el("div"); }

  const [profiles, members, hikes, logs, stats] = await Promise.all([
    DB.list("profiles", { filter: { id }, limit: 1 }),
    DB.list("hike_members"),
    DB.list("hikes"),
    DB.list("trail_logs", { filter: { user_id: id } }),
    DB.statsFor(id),
  ]);

  const p = profiles[0];
  if (!p) {
    return el("div", { class: "stack", style: "padding-top:60px" }, [
      el("h1", { class: "display", text: "No such person" }),
      el("p", { class: "meta", text: "They may have deleted their account." }),
      el("a", { class: "btn btn--primary", href: "#/matchmaker", text: "Find a hike" }),
    ]);
  }

  const lv = levelFor(stats.xp || 0);
  const theirs = new Set(members.filter((m) => m.user_id === id && m.status !== "left").map((m) => m.hike_id));
  const mine = new Set(members.filter((m) => m.user_id === meId && m.status !== "left").map((m) => m.hike_id));
  const shared = [...theirs].filter((h) => mine.has(h));
  const hosted = hikes.filter((h) => h.host_id === id);
  const totalM = logs.reduce((a, l) => a + (l.distance_m || 0), 0);
  const totalS = logs.reduce((a, l) => a + (l.duration_s || 0), 0);

  const wrap = el("div");

  wrap.append(
    el("div", { class: "topbar topbar--left" }, [
      el("button", { class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back", html: icon("back", { size: 20 }), onclick: back }),
      el("h1", { class: "display", style: "font-size:1.4rem", text: p.display_name }),
    ])
  );

  /* ---- the header card ---- */
  wrap.append(
    el("section", { class: "personhead" }, [
      avatar(p.avatar_url, p.display_name, "avatar avatar--xl"),
      el("div", { class: "personhead__body" }, [
        el("span", { class: "personhead__name", text: p.display_name }),
        p.pronouns ? el("span", { class: "tiny", text: p.pronouns }) : null,
        el("span", { class: "personhead__lv" }, [
          el("span", { class: "pbadge__lv", text: `Lv ${lv.level}` }),
          el("span", { class: "meta", text: lv.name }),
        ]),
        stats.streak
          ? el("span", { class: "chipstat chipstat--streak is-lit", style: "margin-top:8px",
              html: `${icon("flame", { size: 14 })}<b>${stats.streak}</b>`,
              "aria-label": `${stats.streak} day streak` })
          : el("span", { class: "tiny", style: "margin-top:8px", text: "Not active right now" }),
      ]),
    ])
  );

  if (p.bio) wrap.append(el("p", { class: "prose", style: "padding:4px 20px 0", text: p.bio }));

  wrap.append(
    el("section", { class: "block" }, [
      el("div", { class: "detail" }, [
        el("span", { class: "detail__ic", html: icon("route", { size: 20 }) }),
        el("span", { text: EXPERIENCE_LABEL[p.experience] || "Hiker" }),
      ]),
      p.home_area ? el("div", { class: "detail" }, [
        el("span", { class: "detail__ic", html: icon("pin", { size: 20 }) }),
        el("span", { text: p.home_area }),
      ]) : null,
      shared.length ? el("div", { class: "detail" }, [
        el("span", { class: "detail__ic", html: icon("people", { size: 20 }) }),
        el("span", { text: `${shared.length} hike${shared.length === 1 ? "" : "s"} with you` }),
      ]) : null,
    ])
  );

  wrap.append(
    el("div", { class: "statgrid" }, [
      st(String(stats.xp || 0), "XP"),
      st(String(theirs.size), theirs.size === 1 ? "hike" : "hikes"),
      st(String(hosted.length), hosted.length === 1 ? "hosted" : "hosted"),
      st(fmtDistance(totalM), "walked"),
    ])
  );

  if (totalS) {
    wrap.append(el("p", { class: "tiny", style: "padding:2px 20px 0", text: `${fmtDuration(totalS)} on foot across ${logs.length} logged trail${logs.length === 1 ? "" : "s"}.` }));
  }

  /* ---- their gallery, behind the lens ----
     You can see that they have photos and roughly what of; bringing
     one into focus takes a deliberate move. That is the difference
     between browsing someone and glancing at them. */
  const theirShots = [...theirs]
    .map((hid) => hikes.find((x) => x.id === hid))
    .filter(Boolean)
    .map((x) => ({ url: x.photo_url || landscape(x.id), alt: `${x.title} — ${x.location_name || x.region}` }));

  if (theirShots.length) {
    while (theirShots.length < 6) {
      theirShots.push({ url: landscape(`${id}-${theirShots.length}`), alt: "A walk they have not logged yet" });
    }
    wrap.append(el("h2", { class: "sectionhead", text: `${p.display_name}'s gallery` }));
    wrap.append(gallery(theirShots, { lens: true, onOpen: (sh) => say(sh.alt) }));
  }

  /* ---- what they're hosting, so you can actually go with them ---- */
  const open = hosted.filter((h) => h.status === "open");
  if (open.length) {
    wrap.append(el("h2", { class: "sectionhead", text: `Hosting` }));
    wrap.append(el("div", { class: "stack" }, open.map((h) =>
      el("button", { class: "row", type: "button", onclick: () => go(`hike/${h.id}`) }, [
        el("span", { class: "iconbtn", html: icon("map", { size: 20 }) }),
        el("span", { class: "row__body" }, [
          el("span", { class: "row__title", text: h.title.split("—")[0].trim() }),
          el("span", { class: "row__sub", text: `${fmtShortDate(h.confirmed_date || h.proposed_date)} · ${difficultyLabel(h.difficulty)}` }),
        ]),
        el("span", { class: "iconbtn", html: icon("arrow", { size: 18 }) }),
      ])
    )));
  }

  /* ---- shared hikes are the only place you can actually talk ---- */
  if (shared.length) {
    wrap.append(el("h2", { class: "sectionhead", text: "You're both in" }));
    wrap.append(el("div", { class: "stack" }, shared.map((hid) => {
      const h = hikes.find((x) => x.id === hid);
      if (!h) return null;
      return el("button", { class: "row", type: "button", onclick: () => go(`chat/${h.id}`) }, [
        el("span", { class: "iconbtn", html: icon("chat", { size: 20 }) }),
        el("span", { class: "row__body" }, [
          el("span", { class: "row__title", text: h.title.split("—")[0].trim() }),
          el("span", { class: "row__sub", text: "Open the group chat" }),
        ]),
      ]);
    }).filter(Boolean)));
  } else {
    wrap.append(el("div", { class: "block" }, [
      el("div", { class: "card", style: "text-align:center;padding:22px" }, [
        el("p", { class: "meta", text: `You haven't been on a hike with ${p.display_name} yet. Join one of theirs and you'll land in the same group chat.` }),
        open.length
          ? el("button", { class: "btn btn--primary", style: "margin-top:12px", type: "button", text: "See their hike", onclick: () => go(`hike/${open[0].id}`) })
          : el("button", { class: "btn btn--ghost", style: "margin-top:12px", type: "button", text: "Find a hike", onclick: () => go("matchmaker") }),
      ]),
    ]));
  }

  say(`${p.display_name}, level ${lv.level}, ${lv.name}.`);
  return wrap;
}

function st(v, l) {
  return el("div", { class: "stat" }, [
    el("span", { class: "stat__v", text: v }),
    el("span", { class: "stat__l", text: l }),
  ]);
}
