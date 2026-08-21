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
    tile("pin", "Location", () => go(`hike/${h.id}`)),
    tile("gear", "Gear", () => go(`gear/${h.id}`)),
    tile(null, "Save", save, true),
  ]));

  return wrap;
}

/* ---------------- gear list ----------------
   Its own screen because the Figma gives it its own button. Not in
   the brief — additive, per the precedence rule. */
export async function gear({ id }) {
  const meId = DB.uid();
  const [rows, plans] = await Promise.all([
    DB.list("hikes", { filter: { id }, limit: 1 }),
    DB.list("plans", { filter: { hike_id: id }, limit: 1 }),
  ]);
  const h = rows[0];
  if (!h) return el("p", { class: "meta", style: "padding:40px 20px", text: "That hike no longer exists." });

  const p = plans[0] || { gear: [] };
  const items = [...(p.gear || [])];
  const checked = new Set();

  const wrap = el("div");
  wrap.append(
    el("div", { class: "topbar topbar--left" }, [
      el("button", { class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back", html: icon("back", { size: 20 }), onclick: back }),
      el("h1", { class: "display", style: "font-size:1.5rem", text: "What to bring" }),
    ])
  );

  const list = el("ul", { class: "checklist" });
  const draw = () => {
    list.replaceChildren(...items.map((g, i) =>
      el("li", {}, [
        el("button", {
          class: "checkline",
          type: "button",
          "aria-pressed": checked.has(i) ? "true" : "false",
          onclick: (e) => {
            if (checked.has(i)) checked.delete(i); else checked.add(i);
            e.currentTarget.setAttribute("aria-pressed", checked.has(i) ? "true" : "false");
            say(checked.has(i) ? `${g}, packed` : `${g}, unpacked`);
          },
        }, [
          el("span", { class: "checkline__box", html: icon("check", { size: 14 }) }),
          el("span", { text: g }),
        ]),
      ])
    ));
    if (!items.length) list.append(el("li", { class: "tiny", style: "padding:10px 2px", text: "Nothing on the list yet." }));
  };
  draw();
  wrap.append(el("div", { class: "block" }, [list]));

  const input = el("input", { class: "field", type: "text", placeholder: "Add an item", "aria-label": "Add a gear item" });
  wrap.append(el("div", { class: "block inline" }, [
    input,
    el("button", {
      class: "btn btn--ghost", type: "button", "aria-label": "Add gear item", html: icon("plus", { size: 18 }),
      onclick: async () => {
        const v = input.value.trim();
        if (!v) return;
        items.push(v); input.value = ""; draw();
        await DB.upsert("plans", { hike_id: h.id, gear: items, updated_by: meId }, ["hike_id"]);
        say(`Added ${v}`);
      },
    }),
  ]));

  return wrap;
}
