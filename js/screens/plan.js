/* ============================================================
   Biomate — "Plan your activity"

   Straight from the Figma frame 31:3326: overlapping avatars, the
   title, a content area, then Calendar Availability / Location /
   Gear / Save.

   The Figma leaves the content box empty because the designer is
   still thinking about it. Per the precedence rule the brief wins
   where the design is silent, so the box holds what the whiteboard
   asked for: purpose, activities, stop points.
   ============================================================ */

import { DB } from "../db.js";
import { el, avatar, toast } from "../ui.js";
import { icon } from "../icons.js";
import { say } from "../a11y.js";
import { go, back } from "../router.js";

export async function plan({ id }) {
  const meId = DB.uid();
  const [rows, members, plans, profiles] = await Promise.all([
    DB.list("hikes", { filter: { id }, limit: 1 }),
    DB.list("hike_members", { filter: { hike_id: id } }),
    DB.list("plans", { filter: { hike_id: id }, limit: 1 }),
    DB.list("profiles"),
  ]);

  const h = rows[0];
  if (!h) return el("p", { class: "meta", style: "padding:40px 20px", text: "That hike no longer exists." });

  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const joined = members.filter((m) => m.status !== "left");
  const p = plans[0] || { agenda: "", stop_points: [], meeting_point: "", gear: [] };

  const wrap = el("div");

  wrap.append(
    el("div", { class: "topbar" }, [
      el("button", { class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back", html: icon("back", { size: 20 }), onclick: back }),
      el("span", { class: "avstack" }, joined.slice(0, 3).map((m) => avatar((byId[m.user_id] || {}).avatar_url, (byId[m.user_id] || {}).display_name || "?"))),
      el("span", { style: "width:34px" }),
    ]),
    el("h1", { class: "display", style: "text-align:center;padding:0 20px 14px", text: "Plan your activity" })
  );

  /* the content area — a textarea, because a plan is something the
     group writes together, not a form with fixed fields */
  const agenda = el("textarea", {
    class: "planbox",
    id: "agenda",
    rows: "6",
    placeholder: "What are we actually doing? Sunrise start, lunch spot, who's driving…",
    "aria-label": "The plan",
  });
  agenda.value = p.agenda || "";

  const meeting = el("input", {
    class: "field", type: "text", id: "meeting",
    placeholder: "Meeting point and time",
    "aria-label": "Meeting point",
  });
  meeting.value = p.meeting_point || "";

  wrap.append(el("div", { class: "block" }, [agenda]));
  wrap.append(el("div", { class: "block" }, [
    el("label", { class: "tiny", for: "meeting", text: "MEETING POINT" }),
    meeting,
  ]));

  /* stop points — a list you add to, from the whiteboard's Agenda page */
  const stops = [...(p.stop_points || [])];
  const stopList = el("ul", { class: "chiplist", "aria-label": "Stop points" });
  const drawStops = () => {
    stopList.replaceChildren(...stops.map((s, i) =>
      el("li", {}, [
        el("span", { text: s }),
        el("button", {
          class: "chiplist__x", type: "button", "aria-label": `Remove stop ${s}`,
          html: icon("close", { size: 14 }),
          onclick: () => { stops.splice(i, 1); drawStops(); say(`Removed ${s}`); },
        }),
      ])
    ));
    if (!stops.length) stopList.append(el("li", { class: "tiny", text: "No stops yet" }));
  };
  drawStops();

  const stopInput = el("input", { class: "field", type: "text", id: "stop", placeholder: "Add a stop point", "aria-label": "Add a stop point" });
  const addStop = () => {
    const v = stopInput.value.trim();
    if (!v) return;
    stops.push(v); stopInput.value = ""; drawStops(); say(`Added ${v}`);
  };

  wrap.append(el("section", { class: "block" }, [
    el("h2", { class: "h2", text: "Stop points" }),
    stopList,
    el("div", { class: "inline" }, [
      stopInput,
      el("button", { class: "btn btn--ghost", type: "button", "aria-label": "Add stop point", html: icon("plus", { size: 18 }), onclick: addStop }),
    ]),
  ]));

  /* ---- the four buttons ---- */
  const tile = (ic, label, onclick, primary) =>
    el("button", { class: `tile ${primary ? "tile--primary" : ""}`, type: "button", onclick }, [
      primary ? null : el("span", { class: "tile__ic", html: icon(ic, { size: 20 }) }),
      el("span", { text: label }),
    ]);

  const save = async () => {
    await DB.upsert("plans", {
      hike_id: h.id,
      agenda: agenda.value.trim(),
      stop_points: stops,
      meeting_point: meeting.value.trim(),
      gear: p.gear || [],
      updated_by: meId,
    }, ["hike_id"]);
    toast("Plan saved");
    say("Plan saved for everyone in the group.");
  };

  wrap.append(el("div", { class: "tiles" }, [
    tile("calendar", "Calendar Availability", () => go(`when/${h.id}`)),
    /* v7 added a real Location screen; this tile still pointed at the
       hike page, so the identical-looking tile in planTiles() and this
       one went to different places. */
    tile("pin", "Location", () => go(`location/${h.id}`)),
    tile("gear", "Gear", () => go(`gear/${h.id}`)),
    tile(null, "Save", save, true),
  ]));

  return wrap;
}

/* ---------------- gear list ----------------
   Its own screen because the Figma gives it its own button. Not in
   the brief — additive, per the precedence rule. */
/* ============================================================
   Gear — rebuilt from the updated Figma (node 31:3611)

   ⚠️ That node is NAMED "Location" and is actually the Gear screen.
   Screenshotted before building, which is the only reason this is not
   a Location page — Peak & Pan shipped three screens built from node
   names alone and all three were wrong.

   What the design changed:
     · items are numbered, filled cards — not check rows
     · each item has a NAME and a NOTE ("Water" / "3 L minimum per
       person"), so a gear item is two fields, not a string
     · the toggle is a ring on the right, not a box on the left
     · the four planner tiles sit at the bottom of this screen too,
       so Calendar / Location / Gear are siblings you can move
       between rather than three separate dead ends

   Old rows are plain strings in `plans.gear`. They are read as a name
   with no note rather than migrated — the column is jsonb, both shapes
   live in it happily, and a migration to gain a subtitle nobody has
   written yet would be work for its own sake.
   ============================================================ */
export async function gear({ id }) {
  const meId = DB.uid();
  const [rows, plans, members, profiles] = await Promise.all([
    DB.list("hikes", { filter: { id }, limit: 1 }),
    DB.list("plans", { filter: { hike_id: id }, limit: 1 }),
    DB.list("hike_members", { filter: { hike_id: id } }),
    DB.list("profiles"),
  ]);
  const h = rows[0];
  if (!h) return el("p", { class: "meta", style: "padding:40px 20px", text: "That hike no longer exists." });

  const p = plans[0] || { gear: [] };
  /* accepts both the old string rows and the new {name, note} ones */
  const items = (p.gear || []).map((g) =>
    typeof g === "string" ? { name: g, note: "" } : { name: g.name || "", note: g.note || "" }
  );
  const packed = new Set();

  const wrap = el("div");
  wrap.append(planHeader(h, members, profiles, "Gear"));

  const list = el("ol", { class: "gearlist" });
  const draw = () => {
    list.replaceChildren(...items.map((g, i) =>
      el("li", {}, [
        el("button", {
          class: "gearitem",
          type: "button",
          "aria-pressed": packed.has(i) ? "true" : "false",
          "aria-label": `${g.name}${g.note ? `. ${g.note}` : ""}. ${packed.has(i) ? "Packed" : "Not packed"}.`,
          onclick: (e) => {
            if (packed.has(i)) packed.delete(i); else packed.add(i);
            e.currentTarget.setAttribute("aria-pressed", packed.has(i) ? "true" : "false");
            say(packed.has(i) ? `${g.name}, packed` : `${g.name}, unpacked`);
          },
        }, [
          el("span", { class: "gearitem__n", "aria-hidden": "true", text: String(i + 1) }),
          el("span", { class: "gearitem__body" }, [
            el("span", { class: "gearitem__name", text: g.name }),
            g.note ? el("span", { class: "gearitem__note", text: g.note }) : null,
          ]),
          el("span", { class: "gearitem__ring", "aria-hidden": "true" }),
        ]),
      ])
    ));
    if (!items.length) {
      list.append(el("li", { class: "tiny", style: "padding:10px 2px", text: "Nothing on the list yet. Add the first thing anyone will need." }));
    }
  };
  draw();
  wrap.append(el("div", { class: "block" }, [list]));

  /* The design shows no add control, but the whole point of a shared
     plan is that the group builds it — dropping this would remove a
     working feature to match a mock that simply did not draw it. */
  const name = el("input", { class: "field", type: "text", placeholder: "Water", "aria-label": "What to bring" });
  const note = el("input", { class: "field", type: "text", placeholder: "3 L minimum per person", "aria-label": "A note about it, optional" });
  const add = async () => {
    const v = name.value.trim();
    if (!v) return;
    items.push({ name: v, note: note.value.trim() });
    name.value = ""; note.value = ""; draw();
    await DB.upsert("plans", { hike_id: h.id, gear: items, updated_by: meId }, ["hike_id"]);
    say(`Added ${v}`);
    name.focus();
  };
  wrap.append(
    el("div", { class: "block" }, [
      el("p", { class: "tiny", text: "ADD SOMETHING" }),
      el("div", { class: "gearadd" }, [
        name,
        note,
        el("button", { class: "btn btn--ghost", type: "button", "aria-label": "Add to the list", html: icon("plus", { size: 18 }), onclick: add }),
      ]),
    ])
  );

  wrap.append(planTiles(h, "gear"));
  return wrap;
}

/* ---- shared by the three planner screens ----
   The updated Figma puts the same header and the same four tiles on
   Calendar, Location and Gear. They were only on the plan page, which
   is what made each of them a dead end you had to back out of. */
export function planHeader(h, members, profiles, title) {
  const byId = Object.fromEntries(profiles.map((x) => [x.id, x]));
  const joined = members.filter((m) => m.status !== "left").slice(0, 3);
  return el("div", { class: "planhead" }, [
    el("button", { class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back", html: icon("back", { size: 20 }), onclick: back }),
    el("span", { class: "avstack planhead__who" }, joined.map((m) =>
      avatar((byId[m.user_id] || {}).avatar_url, (byId[m.user_id] || {}).display_name || "?")
    )),
    el("h1", { class: "display planhead__t", text: title }),
  ]);
}

export function planTiles(h, current) {
  const t = (ic, label, to) =>
    el("button", {
      class: `tile ${current === to ? "is-current" : ""}`,
      type: "button",
      "aria-current": current === to ? "page" : null,
      onclick: () => go(`${to}/${h.id}`),
    }, [
      el("span", { class: "tile__ic", html: icon(ic, { size: 20 }) }),
      el("span", { text: label }),
    ]);
  return el("div", { class: "tiles" }, [
    t("calendar", "Calendar Availability", "when"),
    t("pin", "Location", "location"),
    t("gear", "Gear", "gear"),
    /* NOT "Save" — it never saved anything, it navigated. Each planner
       screen saves its own thing with its own button; this tile is the
       way back to the plan itself, so it says that. */
    el("button", { class: "tile tile--primary", type: "button", text: "The plan", onclick: () => go(`plan/${h.id}`) }),
  ]);
}
