/* ============================================================
   Biomate — a walk you already did

   Aufan: "it saves and kinda gives the path u had been to"

   Recording without this screen is pointless. The route was already
   being saved to `trail_logs.route`; nothing ever drew it again, so
   the walk collapsed into one grey row saying "4.2 km". The map IS
   the reward — it is the bit worth showing someone.

   Two things this screen refuses to fake:

   · If the recording has gaps — you locked the phone, or the signal
     died in a gully — the line breaks and the screen says how many
     times. A continuous line over a gap would be an invented route.
   · Ascent is only shown when the device actually reported usable
     altitude. Most phones do not have a barometer, and GPS altitude
     alone drifts by tens of metres standing still. "Not measured" is
     the honest reading; a confident 0 m is not.
   ============================================================ */

import { DB } from "../db.js";
import { el, avatar, fmtDate, fmtDistance, fmtDuration } from "../ui.js";
import { icon } from "../icons.js";
import { drawRoute } from "../routemap.js";
import { segments, countPoints } from "../track.js";
import { go, back } from "../router.js";

export async function walk({ id }) {
  const meId = DB.uid();
  const [logs, hikes, members, profiles] = await Promise.all([
    DB.list("trail_logs", { filter: { id }, limit: 1 }),
    DB.list("hikes"),
    DB.list("hike_members"),
    DB.list("profiles"),
  ]);

  const log = logs[0];
  const wrap = el("div");

  wrap.append(
    el("div", { class: "topbar topbar--left" }, [
      el("button", { class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back", html: icon("back", { size: 20 }), onclick: back }),
      el("h1", { class: "display", style: "font-size:1.5rem", text: "A walk you did" }),
    ])
  );

  if (!log) {
    wrap.append(el("p", { class: "meta", style: "padding:40px 20px", text: "That walk is not here any more." }));
    return wrap;
  }

  const h = hikes.find((x) => x.id === log.hike_id) || null;
  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const route = Array.isArray(log.route) ? log.route : [];
  const segs = segments(route);
  const points = countPoints(route);
  const gaps = Math.max(0, segs.length - 1);

  wrap.append(
    el("p", { class: "meta", style: "padding:0 20px 10px" }, [
      el("span", { text: h ? h.title.split("—")[0].trim() : "An unplanned walk" }),
      el("span", { text: log.created_at ? ` · ${fmtDate(log.created_at)}` : "" }),
    ])
  );

  /* ---- the map ---- */
  const canvas = el("canvas", {
    class: "route", width: "900", height: "620", role: "img",
    "aria-label": points
      ? `The route you walked: ${fmtDistance(log.distance_m)} over ${points} recorded points${gaps ? `, with ${gaps} break${gaps === 1 ? "" : "s"} where the signal was lost` : ""}.`
      : "No route was recorded for this walk.",
  });
  wrap.append(el("div", { class: "block" }, [canvas]));
  /* Drawn synchronously, NOT in requestAnimationFrame. A canvas bitmap
     is sized by its width/height attributes and needs no layout, so
     there was never a reason to defer — and rAF does not fire at all
     while the document is hidden, so a walk opened in a background tab
     rendered as blank paper until you happened to look at it. */
  drawRoute(canvas, route);

  /* ---- the numbers ---- */
  const pace = log.distance_m > 50
    ? (log.duration_s / 60 / (log.distance_m / 1000)).toFixed(1)
    : "—";

  wrap.append(
    el("div", { class: "walkstats", role: "group", "aria-label": "Walk summary" }, [
      stat(fmtDistance(log.distance_m), "distance"),
      stat(fmtDuration(log.duration_s), "moving time"),
      stat(pace, "min / km"),
      stat(log.ascent_m ? `${log.ascent_m} m` : "not measured", "climbed"),
    ])
  );

  if (!log.ascent_m) {
    wrap.append(el("p", { class: "tiny", style: "padding:2px 20px 0", text: "Climb is only recorded when the phone reports a usable altitude — most do not have the sensor for it, so this is left blank rather than guessed." }));
  }

  /* ---- what the recording actually was ---- */
  const notes = [];
  notes.push(`${points} point${points === 1 ? "" : "s"} kept`);
  if (gaps) notes.push(`${gaps} break${gaps === 1 ? "" : "s"} in the signal`);
  wrap.append(
    el("p", { class: "tiny", style: "padding:10px 20px 0", text: notes.join(" · ") + (gaps ? " — the line breaks where the recording stopped, rather than drawing across ground you may not have walked." : "") })
  );

  /* ---- who was there ---- */
  if (h) {
    const with_ = members.filter((m) => m.hike_id === h.id && m.status !== "left" && m.user_id !== meId);
    if (with_.length) {
      wrap.append(el("h2", { class: "sectionhead", text: "Who was there" }));
      wrap.append(el("div", { class: "stack" }, with_.slice(0, 8).map((m) => {
        const p = byId[m.user_id] || { display_name: "someone" };
        return el("button", { class: "row", type: "button", onclick: () => go(`person/${m.user_id}`) }, [
          avatar(p.avatar_url, p.display_name),
          el("span", { class: "row__body" }, [
            el("span", { class: "row__title", text: p.display_name }),
            el("span", { class: "row__sub", text: p.home_area || "" }),
          ]),
          el("span", { class: "iconbtn", html: icon("arrow", { size: 20 }) }),
        ]);
      })));
    }

    wrap.append(
      el("div", { class: "block" }, [
        el("button", {
          class: "btn btn--ghost btn--block", type: "button",
          html: `${icon("pin", { size: 18 })}<span>Open the hike</span>`,
          onclick: () => go(`hike/${h.id}`),
        }),
      ])
    );
  }

  return wrap;
}

function stat(value, label) {
  return el("div", { class: "walkstat" }, [
    el("span", { class: "big", text: value }),
    el("span", { class: "stat__l", text: label }),
  ]);
}
