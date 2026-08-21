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
import { el, avatar, fmtDistance, fmtShortDate } from "../ui.js";
import { icon } from "../icons.js";
import { say, reducedMotion } from "../a11y.js";
import { landscape } from "../art.js";
import { go, back } from "../router.js";

export async function shelf({ id }) {
  const section = id || "photos";
  const meId = DB.uid();

  const [members, hikes, logs, profiles, scans] = await Promise.all([
    DB.list("hike_members"),
    DB.list("hikes"),
    DB.list("trail_logs", { filter: { user_id: meId } }),
    DB.list("profiles"),
    DB.list("scans", { filter: { user_id: meId } }),
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

    wrap.append(photoGrid(shots));
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

    if (logs.length) {
      wrap.append(el("h2", { class: "sectionhead", text: "Logged trails" }));
      wrap.append(el("div", { class: "stack" }, logs.map((l) =>
        el("div", { class: "row" }, [
          el("span", { class: "iconbtn", html: icon("route", { size: 20 }) }),
          el("span", { class: "row__body" }, [
            el("span", { class: "row__title", text: (hikeById[l.hike_id] || {}).title || "A walk" }),
            el("span", { class: "row__sub", text: `${fmtDistance(l.distance_m)} · ${Math.round(l.duration_s / 60)} min` }),
          ]),
        ])
      )));
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
      const shared = members.filter((m) => m.user_id === u && myHikeIds.has(m.hike_id)).length;
      return el("div", { class: "row" }, [
        avatar(p.avatar_url, p.display_name),
        el("span", { class: "row__body" }, [
          el("span", { class: "row__title", text: p.display_name }),
          el("span", { class: "row__sub", text: `${p.pronouns ? p.pronouns + " · " : ""}${shared} hike${shared === 1 ? "" : "s"} together` }),
        ]),
      ]);
    }) : [empty("Nobody yet", "The people on your hikes show up here.", () => go("matchmaker"), "Find a hike")]));
    return wrap;
  }

  /* badges — earned, and you choose which to display (the whiteboard) */
  const earned = [
    { key: "first", label: "First steps", when: logs.length >= 1, hint: "Log your first trail" },
    { key: "ten", label: "Ten kay", when: logs.reduce((a, l) => a + l.distance_m, 0) >= 10000, hint: "Walk 10 km in total" },
    { key: "social", label: "Good company", when: myHikeIds.size >= 2, hint: "Join two hikes" },
    { key: "host", label: "Trail boss", when: hikes.some((h) => h.host_id === meId), hint: "Host a hike yourself" },
    { key: "botanist", label: "Botanist", when: scans.length >= 3, hint: "Identify three plants or animals" },
  ];
  wrap.append(el("div", { class: "badgegrid" }, earned.map((b) =>
    el("div", { class: `badge ${b.when ? "badge--on" : ""}` }, [
      el("span", { class: "badge__ic", html: icon(b.when ? "check" : "leaf", { size: 20 }) }),
      el("span", { class: "badge__l", text: b.label }),
      el("span", { class: "tiny", text: b.when ? "Earned" : b.hint }),
    ])
  )));
  return wrap;
}

function empty(title, body, onAct, actLabel) {
  return el("div", { class: "card", style: "text-align:center;padding:26px" }, [
    el("p", { class: "display", style: "font-size:1.2rem;margin-bottom:6px", text: title }),
    el("p", { class: "meta", text: body }),
    onAct ? el("button", { class: "btn btn--primary", style: "margin-top:14px", type: "button", text: actLabel, onclick: onAct }) : null,
  ]);
}

/* ---------------- the photo grid + lens ---------------- */
function photoGrid(shots) {
  const holder = el("div", { class: "lenswrap" });

  const grid = el("div", { class: "pgrid" },
    shots.map((s, i) =>
      el("button", {
        class: "pgrid__cell",
        type: "button",
        "aria-label": s.alt || `Photo ${i + 1}`,
        onclick: () => say(s.alt || "Photo"),
      }, [el("img", { src: s.url, alt: "", loading: s.url.startsWith("data:") ? "eager" : "lazy" })])
    )
  );

  /* the veil: one blur over the whole grid with a hole punched at
     --lx/--ly. Scales to any number of photos, unlike the two-copies
     trick which only works for a single image. */
  const veil = el("div", { class: "lens__veil", "aria-hidden": "true" });
  const rim = el("div", {
    class: "lens__rim",
    role: "slider",
    tabindex: "0",
    "aria-label": "Focus lens. Drag it, or use the arrow keys, to bring photos into focus.",
    "aria-valuetext": "centre",
  });

  holder.append(grid, veil, rim);

  let lx = 50, ly = 44;          /* percent — above centre, out of thumb range */
  let lift = 0;

  const place = () => {
    holder.style.setProperty("--lx", lx + "%");
    holder.style.setProperty("--ly", `calc(${ly}% - ${lift}px)`);
    rim.style.left = lx + "%";
    rim.style.top = `calc(${ly}% - ${lift}px)`;
  };

  const fromEvent = (e) => {
    const r = holder.getBoundingClientRect();
    lx = Math.max(6, Math.min(94, ((e.clientX - r.left) / r.width) * 100));
    ly = Math.max(8, Math.min(92, ((e.clientY - r.top) / r.height) * 100));
    place();
  };

  let dragging = false;
  rim.addEventListener("pointerdown", (e) => {
    dragging = true;
    rim.setPointerCapture(e.pointerId);
    rim.dataset.held = "1";
    /* lift only for touch — a mouse cursor is a point and occludes
       nothing, so shifting the lens away from it would just feel wrong */
    lift = e.pointerType === "touch" ? 72 : 0;
    place();
  });
  rim.addEventListener("pointermove", (e) => { if (dragging) fromEvent(e); });
  const drop = () => {
    if (!dragging) return;
    dragging = false;
    rim.dataset.held = "0";
    lift = 0;
    place();
    rim.setAttribute("aria-valuetext", `${Math.round(lx)} percent across, ${Math.round(ly)} percent down`);
  };
  rim.addEventListener("pointerup", drop);
  rim.addEventListener("pointercancel", drop);

  rim.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 12 : 5;
    if (e.key === "ArrowLeft") lx = Math.max(6, lx - step);
    else if (e.key === "ArrowRight") lx = Math.min(94, lx + step);
    else if (e.key === "ArrowUp") ly = Math.max(8, ly - step);
    else if (e.key === "ArrowDown") ly = Math.min(92, ly + step);
    else return;
    e.preventDefault();
    place();
  });

  if (reducedMotion()) rim.style.transition = "none";
  place();

  const note = el("p", { class: "tiny", style: "padding:10px 20px 0", text: "Drag the circle to bring photos into focus. Arrow keys work too." });
  return el("div", {}, [holder, note]);
}
