/* ============================================================
   Biomate — the shelf sections

   Photos carries Aufan's spec for the focus lens on phone:

     "just like in phone it is a circle there, and if u hold u kinda
      drag it around for blurr thingy"

   A visible circle sits on the grid. Press it, drag it, let go — it
   stays where you left it, so "drag it over, then tap the photo"
   works as one continuous move.

   Three things it has to get right, all learned rather than guessed:
     · LIFT the lens ~72px above the touch point while dragging, or
       your own hand covers exactly what it reveals. Same lift iOS
       uses for text selection, so it is already a learned gesture.
     · touch-action:none on the RIM only — the lens drags, the page
       still scrolls everywhere else. No hold-delay, no gesture
       arbitration.
     · give it a rim and a shadow. An un-rimmed circle reads as a
       rendering artefact and nobody tries to grab it.

   ⚠️ The blur is visual only. Every photo keeps its alt text and
   stays focusable — a state that only a pointer can reveal would be
   a bug, not an effect.
   ============================================================ */

import { DB } from "../db.js";
import { el, avatar, fmtDistance, fmtShortDate, toast } from "../ui.js";
import { icon } from "../icons.js";
import { say, reducedMotion } from "../a11y.js";
import { landscape } from "../art.js";
import { gallery } from "../gallery.js";
import { drawRoute } from "../routemap.js";
import { go, back } from "../router.js";
import { personBadge } from "../appbar.js";
import { catalogue, TIERS, MAX_SHOWCASE } from "../badges.js";
import { celebrateNew } from "../fx.js";
import { levelFor } from "../levels.js";

export async function shelf({ id }) {
  const section = id || "photos";
  const meId = DB.uid();

  const [members, hikes, logs, profiles, scans, stats] = await Promise.all([
    DB.list("hike_members"),
    DB.list("hikes"),
    DB.list("trail_logs", { filter: { user_id: meId } }),
    DB.list("profiles"),
    DB.list("scans", { filter: { user_id: meId } }),
    DB.allStats(),
  ]);

  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const hikeById = Object.fromEntries(hikes.map((h) => [h.id, h]));
  const myHikeIds = new Set(members.filter((m) => m.user_id === meId && m.status !== "left").map((m) => m.hike_id));

  const titles = { photos: "Photos", hikes: "Hikes", people: "People", badges: "Badges" };

  const wrap = el("div");
  wrap.append(
    el("div", { class: "topbar topbar--left" }, [
      el("button", { class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back to shelf", html: icon("back", { size: 20 }), onclick: back }),
      el("h1", { class: "display", style: "font-size:1.5rem", text: titles[section] || "Shelf" }),
    ])
  );

  if (section === "photos") {
    const shots = [
      ...[...myHikeIds].map((hid) => ({
        url: (hikeById[hid] || {}).photo_url || landscape(hid),
        alt: (hikeById[hid] || {}).title || "",
      })),
      ...scans.map((s) => ({ url: s.image_url, alt: s.label || "Scan" })),
    ].filter((s) => s.url);

    /* pad so the grid always has something to reveal */
    while (shots.length < 9) shots.push({ url: landscape("filler" + shots.length), alt: "A walk you haven't logged yet" });

    /* No lens on your OWN gallery. The circle is for peeking at
       someone else's photos; over your own it is just friction. */
    wrap.append(el("p", { class: "meta", style: "padding:0 20px 10px", text: "Everywhere you have been." }));
    wrap.append(gallery(shots, { lens: false }));
    return wrap;
  }

  if (section === "hikes") {
    const rows = [...myHikeIds].map((hid) => hikeById[hid]).filter(Boolean);
    wrap.append(el("div", { class: "stack" }, rows.length ? rows.map((h) =>
      el("button", { class: "row", type: "button", onclick: () => go(`hike/${h.id}`) }, [
        avatar((byId[h.host_id] || {}).avatar_url, (byId[h.host_id] || {}).display_name),
        el("span", { class: "row__body" }, [
          el("span", { class: "row__title", text: h.title.split("—")[0].trim() }),
          el("span", { class: "row__sub", text: `${fmtShortDate(h.confirmed_date || h.proposed_date)} · ${h.location_name || h.region}` }),
        ]),
      ])
    ) : [empty("No hikes yet", "Swipe right on one and it lands here.", () => go("matchmaker"), "Find a hike")]));

    /* Each logged walk shows the SHAPE of the route it recorded, not
       just its distance. That thumbnail is the whole reason for
       recording — two walks of 4 km look identical as a number and
       completely different as a line. */
    if (logs.length) {
      wrap.append(el("h2", { class: "sectionhead", text: "Logged trails" }));
      wrap.append(el("div", { class: "stack" }, logs.map((l) => {
        const thumb = el("canvas", { class: "routethumb", width: "120", height: "120", "aria-hidden": "true" });
        /* synchronous on purpose — see the note in screens/walk.js:
           rAF never fires in a hidden document, which left every
           thumbnail blank on a background tab */
        drawRoute(thumb, Array.isArray(l.route) ? l.route : [], { empty: false });
        return el("button", {
          class: "row", type: "button",
          "aria-label": `${(hikeById[l.hike_id] || {}).title || "A walk"}, ${fmtDistance(l.distance_m)}. Open the route.`,
          onclick: () => go(`walk/${l.id}`),
        }, [
          thumb,
          el("span", { class: "row__body" }, [
            el("span", { class: "row__title", text: (hikeById[l.hike_id] || {}).title || "A walk" }),
            el("span", { class: "row__sub", text: `${fmtDistance(l.distance_m)} · ${Math.round(l.duration_s / 60)} min` }),
          ]),
          el("span", { class: "iconbtn", html: icon("arrow", { size: 20 }) }),
        ]);
      })));
    }
    return wrap;
  }

  if (section === "people") {
    const people = [...new Set(
      members.filter((m) => myHikeIds.has(m.hike_id) && m.user_id !== meId && m.status !== "left").map((m) => m.user_id)
    )];
    wrap.append(el("p", { class: "meta", style: "padding:0 20px 10px", text: `${people.length} ${people.length === 1 ? "person" : "people"} you've walked with.` }));
    wrap.append(el("div", { class: "stack" }, people.length ? people.map((u) => {
      const p = byId[u] || { display_name: "someone" };
      /* `status !== "left"` matters here: without it, someone who left
         a shared hike still counted toward "2 hikes together". Every
         other filter in this file had it; this one was missed. */
      const shared = members.filter((m) => m.user_id === u && m.status !== "left" && myHikeIds.has(m.hike_id)).length;
      return el("button", { class: "row", type: "button", onclick: () => go(`person/${u}`) }, [
        avatar(p.avatar_url, p.display_name),
        el("span", { class: "row__body" }, [
          el("span", { class: "row__title" }, [
            el("span", { text: p.display_name }),
            personBadge(stats[u]),
          ]),
          el("span", { class: "row__sub", text: `${p.pronouns ? p.pronouns + " · " : ""}${shared} hike${shared === 1 ? "" : "s"} together` }),
        ]),
      ]);
    }) : [empty("Nobody yet", "The people on your hikes show up here.", () => go("matchmaker"), "Find a hike")]));
    return wrap;
  }

  /* ---- badges: the collection, and the three you show off ----
     The whiteboard asked for "choose badges to display", and that is
     the part that makes a collection worth having — everything else
     is a checklist. Earning is derived from data; only the CHOICE is
     stored, because a choice is a preference, not a score. */
  const me = await DB.me();
  const facts = {
    joined: myHikeIds.size,
    hosted: hikes.filter((h) => h.host_id === meId).length,
    logs: logs.length,
    metres: logs.reduce((a, l) => a + (l.distance_m || 0), 0),
    messages: (await DB.list("messages", { filter: { user_id: meId } })).length,
    scans: scans.length,
    states: new Set([...myHikeIds].map((id) => (hikeById[id] || {}).region).filter(Boolean)).size,
    hardDone: [...myHikeIds].filter((id) => (hikeById[id] || {}).difficulty === "hard").length,
    streak: (await DB.statsFor(meId)).streak || 0,
    people: new Set(
      members.filter((m) => myHikeIds.has(m.hike_id) && m.user_id !== meId && m.status !== "left").map((m) => m.user_id)
    ).size,
  };
  const all = catalogue(facts);
  const earned = all.filter((b) => b.earned);
  let chosen = [...((me && me.badges) || [])].filter((k) => earned.some((b) => b.key === k));

  wrap.append(
    el("p", { class: "meta", style: "padding:0 20px 4px" }, [
      el("b", { text: `${earned.length} of ${all.length}` }),
      el("span", { text: ` collected. Tap up to ${MAX_SHOWCASE} to show on your profile.` }),
    ])
  );

  const grid = el("div", { class: "badgegrid" });

  const draw = () => {
    grid.replaceChildren(...all.map((b) => {
      const picked = chosen.includes(b.key);
      const node = el("button", {
        class: `badge badge--${b.tier} ${b.earned ? "badge--on" : ""} ${picked ? "is-picked" : ""}`,
        type: "button",
        "aria-pressed": picked ? "true" : "false",
        disabled: !b.earned,
        "aria-label": b.earned
          ? `${b.name}, ${TIERS[b.tier].label}. Earned. ${picked ? "Showing on your profile." : "Tap to show on your profile."}`
          : `${b.name}, ${TIERS[b.tier].label}. Locked. ${b.hint}. ${b.progress} of ${b.goal}.`,
        onclick: () => toggle(b.key),
      }, [
        el("span", { class: "badge__ic", html: icon(b.icon, { size: 20 }) }),
        el("span", { class: "badge__l", text: b.name }),
        el("span", { class: "tiny", text: b.earned ? TIERS[b.tier].label : b.hint }),
        !b.earned && b.goal > 1
          ? el("span", { class: "badge__bar", "aria-hidden": "true" }, [el("span", { style: `width:${(b.progress / b.goal) * 100}%` })])
          : null,
        picked ? el("span", { class: "badge__pin", html: icon("check", { size: 12 }), "aria-hidden": "true" }) : null,
      ]);
      return node;
    }));
  };

  async function toggle(key) {
    if (chosen.includes(key)) chosen = chosen.filter((k) => k !== key);
    else if (chosen.length < MAX_SHOWCASE) chosen = [...chosen, key];
    else { toast(`Only ${MAX_SHOWCASE} at a time — tap one off first`); say(`You can show ${MAX_SHOWCASE} badges at a time.`); return; }
    draw();
    await DB.saveProfile({ badges: chosen });
    say(chosen.includes(key) ? "Added to your profile." : "Removed from your profile.");
  }

  draw();
  wrap.append(grid);

  /* fire once for anything newly earned since last visit */
  celebrateNew(all, levelFor((await DB.statsFor(meId)).xp || 0).level);

  return wrap;
}

function empty(title, body, onAct, actLabel) {
  return el("div", { class: "card", style: "text-align:center;padding:26px" }, [
    el("p", { class: "display", style: "font-size:1.2rem;margin-bottom:6px", text: title }),
    el("p", { class: "meta", text: body }),
    onAct ? el("button", { class: "btn btn--primary", style: "margin-top:14px", type: "button", text: actLabel, onclick: onAct }) : null,
  ]);
}
