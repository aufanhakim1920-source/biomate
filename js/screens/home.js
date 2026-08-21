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
import { ausMap, ALL_REGIONS, regionName } from "../ausmap.js";
import { missionsFor } from "../quests.js";
import { go } from "../router.js";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export async function home() {
  const meId = DB.uid();
  const [me, hikes, allHikes, members, messages, profiles, swipes, scans, avail, logs] = await Promise.all([
    DB.me(),
    DB.list("hikes", { filter: { status: "open" } }),
    DB.list("hikes"),
    DB.list("hike_members"),
    DB.list("messages"),
    DB.list("profiles"),
    DB.list("swipes", { filter: { user_id: meId } }),
    DB.list("scans", { filter: { user_id: meId } }),
    DB.list("availability", { filter: { user_id: meId } }),
    DB.list("trail_logs", { filter: { user_id: meId } }),
  ]);

  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const myHikes = new Set(members.filter((m) => m.user_id === meId && m.status !== "left").map((m) => m.hike_id));

  const counts = {};
  hikes.forEach((h) => { counts[h.region] = (counts[h.region] || 0) + 1; });

  const wrap = el("div");

  /* No wordmark here — the top bar carries it, and showing it twice on
     the same screen just pushes the map down. */
  wrap.append(
    el("p", { class: "hello" }, [
      el("em", { text: `${greeting()}, ${(me && me.display_name) || "friend"}` }),
      el("span", { text: "Where would you like to explore today?" }),
    ])
  );

  const left = el("div", { class: "home__left" });
  const right = el("div", { class: "home__right" });

  /* ---- the map, doubling as the collection board ---- */
  const hikeById = Object.fromEntries(allHikes.map((h) => [h.id, h]));
  const visited = new Set(
    [...myHikes].map((id) => (hikeById[id] || {}).region).filter(Boolean)
  );
  left.append(ausMap((code) => go(`region/${code}`), counts, visited));

  left.append(
    el("p", { class: "collect" }, [
      el("b", { text: `${visited.size} of ${ALL_REGIONS.length}` }),
      el("span", { text: visited.size === ALL_REGIONS.length
        ? " states walked — the whole country."
        : ` states walked. Next up: ${ALL_REGIONS.filter((c) => !visited.has(c)).map(regionName).slice(0, 2).join(" or ")}.` }),
    ])
  );

  /* ---- today's missions ---- */
  const todayISO = new Date().toISOString().slice(0, 10);
  const sameDay = (iso) => (iso || "").slice(0, 10) === todayISO;
  const facts = {
    swipesToday: swipes.filter((s) => sameDay(s.created_at)).length,
    joinedToday: members.filter((m) => m.user_id === meId && sameDay(m.joined_at)).length,
    messagesToday: messages.filter((m) => m.user_id === meId && sameDay(m.created_at)).length,
    stopsToday: 0,
    scansToday: scans.filter((s) => sameDay(s.created_at)).length,
    availToday: avail.filter((a) => sameDay(a.updated_at)).length,
    metresToday: logs.filter((l) => sameDay(l.created_at)).reduce((a, l) => a + (l.distance_m || 0), 0),
    newPeopleToday: 0,
  };
  const missions = missionsFor(facts, todayISO);
  const doneCount = missions.filter((m) => m.done).length;

  right.append(
    el("section", { class: "missions" }, [
      el("div", { class: "missions__head" }, [
        el("h2", { class: "sectionhead", style: "padding:0", text: "Today's missions" }),
        el("span", { class: "missions__count", text: `${doneCount}/${missions.length}` }),
      ]),
      el("ul", {}, missions.map((m) =>
        el("li", { class: `mission ${m.done ? "is-done" : ""}` }, [
          el("span", { class: "mission__ic", html: icon(m.done ? "check" : m.icon, { size: 18 }) }),
          el("span", { class: "mission__body" }, [
            el("span", { class: "mission__name", text: m.name }),
            el("span", { class: "mission__bar", "aria-hidden": "true" }, [
              el("span", { style: `width:${(m.progress / m.goal) * 100}%` }),
            ]),
          ]),
          el("span", {
            class: "mission__xp",
            text: m.done ? "done" : `+${m.xp}`,
            "aria-label": m.done ? `${m.name}: done` : `${m.name}: ${m.progress} of ${m.goal}, worth ${m.xp} XP`,
          }),
        ])
      )),
    ])
  );

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
  right.append(stack);

  /* ---- next hike, if there is one ---- */
  const next = hikes
    .filter((h) => myHikes.has(h.id) && h.proposed_date)
    .sort((a, b) => (a.proposed_date < b.proposed_date ? -1 : 1))[0];

  if (next) {
    right.append(
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

  wrap.append(el("div", { class: "home__grid" }, [left, right]));
  return wrap;
}
