/* ============================================================
   Biomate — Location (the planner's third screen)

   From the updated Figma, node 31:3478. The design shows a real
   street map with a search field over it, and the four planner tiles
   underneath.

   ⚠️ ONE HONEST GAP, STATED ON SCREEN RATHER THAN FAKED.

   Street tiles have to come from somewhere. Every option is an
   external dependency this project does not currently have:

     · Leaflet + OpenStreetMap tiles — a library and a tile server
     · a static-map image service — a key, and usually a bill
     · an OSM iframe embed — no library, but every visitor's IP goes
       to a third party just for opening a plan

   That last point is the one that matters here. This app ships with
   no trackers and no third-party requests at all, and quietly adding
   one so a mock looks right is not a trade I should make on Aufan's
   behalf. So the map area says what it is waiting for, and everything
   AROUND it — searching for a place, setting the meeting point,
   moving between the planner screens — is real and works now.

   The functionality this screen actually owns is the meeting point,
   which until now was one line buried on the plan page.
   ============================================================ */

import { DB } from "../db.js";
import { el, toast } from "../ui.js";
import { icon } from "../icons.js";
import { say } from "../a11y.js";
import { planHeader, planTiles } from "./plan.js";
import { regionName } from "../ausmap.js";
import { go } from "../router.js";

export async function location({ id }) {
  const meId = DB.uid();
  const [rows, plans, members, profiles] = await Promise.all([
    DB.list("hikes", { filter: { id }, limit: 1 }),
    DB.list("plans", { filter: { hike_id: id }, limit: 1 }),
    DB.list("hike_members", { filter: { hike_id: id } }),
    DB.list("profiles"),
  ]);

  const h = rows[0];
  if (!h) return el("p", { class: "meta", style: "padding:40px 20px", text: "That hike no longer exists." });

  const p = plans[0] || {};
  const wrap = el("div");
  wrap.append(planHeader(h, members, profiles, "Location"));

  /* ---- where the map goes ---- */
  wrap.append(
    el("div", { class: "block" }, [
      el("div", { class: "mapwell", role: "img", "aria-label": `${h.location_name || regionName(h.region) || "The meeting point"}. A street map is not connected — the address below is the plan.` }, [
        el("span", { class: "mapwell__ic", html: icon("pin", { size: 30 }), "aria-hidden": "true" }),
        el("p", { class: "mapwell__where", text: h.location_name || regionName(h.region) || "Somewhere outdoors" }),
        el("p", { class: "mapwell__note", text: "No street map yet — that needs a tile provider, and adding one would send every visitor's details to a third party. Deliberately not done without asking." }),
      ]),
    ])
  );

  /* ---- search ----
     Searches the hikes we have rather than pretending to search the
     world: a place search with no map behind it would be a box that
     does nothing. */
  const results = el("div", { class: "stack", style: "padding-top:6px" });
  const search = el("input", {
    class: "field", type: "search", id: "loc-search",
    placeholder: "Search hikes by place",
    "aria-label": "Search hikes by place",
  });

  const allHikes = await DB.list("hikes");
  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    if (!q) { results.replaceChildren(); return; }
    const hits = allHikes.filter((x) =>
      `${x.location_name || ""} ${x.region || ""} ${x.title || ""}`.toLowerCase().includes(q)
    ).slice(0, 6);
    results.replaceChildren(...(hits.length ? hits.map((x) =>
      el("button", { class: "row", type: "button", onclick: () => go(`hike/${x.id}`) }, [
        el("span", { class: "iconbtn", html: icon("pin", { size: 18 }) }),
        el("span", { class: "row__body" }, [
          el("span", { class: "row__title", text: x.location_name || regionName(x.region) }),
          el("span", { class: "row__sub", text: x.title.split("—")[0].trim() }),
        ]),
      ])
    ) : [el("p", { class: "tiny", style: "padding:8px 2px", text: `Nothing matching “${search.value.trim()}”.` })]));
    say(`${hits.length} match${hits.length === 1 ? "" : "es"}.`);
  });

  wrap.append(el("div", { class: "block" }, [search]), results);

  /* ---- the meeting point, which is the real job of this screen ---- */
  const meet = el("input", {
    class: "field", type: "text", id: "meet", maxlength: "120",
    placeholder: "The car park at the end of Sherbrooke Road",
    "aria-label": "Where the group meets",
  });
  /* ⚠️ meeting_point, not meeting. The column is meeting_point (see
     plan.js:117 and the seed) — writing `meeting` would have been a
     column PostgREST does not know, so the save would 400 and the
     screen would look like it worked right up until you reloaded. */
  meet.value = p.meeting_point || "";

  const saveBtn = el("button", {
    class: "btn btn--primary btn--block", type: "button", text: "Save the meeting point",
    onclick: async () => {
      saveBtn.disabled = true;
      await DB.upsert("plans", { hike_id: h.id, meeting_point: meet.value.trim(), updated_by: meId }, ["hike_id"]);
      saveBtn.disabled = false;
      toast("Meeting point saved");
      say("Meeting point saved.");
    },
  });

  wrap.append(
    el("section", { class: "block" }, [
      el("label", { class: "tiny", for: "meet", text: "WHERE THE GROUP MEETS" }),
      meet,
      el("p", { class: "tiny", style: "padding-top:8px", text: "Everyone on the hike sees this. Be specific — “the car park” is a different place to four people." }),
    ]),
    el("div", { class: "block" }, [saveBtn])
  );

  wrap.append(planTiles(h, "location"));
  return wrap;
}
