/* ============================================================
   Biomate — host a hike, and browse a region

   Hosting is what makes the swipe deck non-empty, so it is a first
   class screen rather than a hidden admin form. Someone creating a
   hike IS creating the group.
   ============================================================ */

import { DB } from "../db.js";
import { el, toast, avatar, fmtShortDate, difficultyLabel } from "../ui.js";
import { icon } from "../icons.js";
import { say } from "../a11y.js";
import { landscape } from "../art.js";
import { photoPicker } from "../photo.js";
import { regionName } from "../ausmap.js";
import { go, back } from "../router.js";

const TAGS = ["Day hikes", "Backpacking", "Trail running", "Dog friendly", "Camping", "Photography"];
const REGIONS = ["VIC", "NSW", "QLD", "SA", "WA", "TAS", "NT"];

export async function host() {
  const meId = DB.uid();
  const wrap = el("div");

  wrap.append(
    el("div", { class: "topbar topbar--left" }, [
      el("button", { class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back", html: icon("back", { size: 20 }), onclick: back }),
      /* "Start a group", not "Host a hike" — it is the same act, and the
         button that gets you here says group. Two names for one thing
         is how a person ends up unsure whether they found the right
         screen. The sub-line below still says what it means in
         practice: you are posting a walk. */
      el("h1", { class: "display", style: "font-size:1.5rem", text: "Start a group" }),
    ]),
    el("p", { class: "meta", style: "padding:0 20px 12px", text: "Post a walk and let people swipe onto it. You set the day; the group can move it later if everyone's free at a better time." })
  );

  const field = (id, label, node) =>
    el("div", { class: "block" }, [
      el("label", { class: "tiny", for: id, text: label.toUpperCase() }),
      node,
    ]);

  const title = el("input", { class: "field", id: "title", type: "text", placeholder: "Grampians Peaks — two nights", "aria-label": "Title" });
  const where = el("input", { class: "field", id: "where", type: "text", placeholder: "Halls Gap", "aria-label": "Location" });
  const date = el("input", { class: "field", id: "date", type: "date", "aria-label": "Proposed date" });
  const desc = el("textarea", { class: "planbox", id: "desc", rows: "5", placeholder: "Tell people what it's actually like. Casual is good.", "aria-label": "Description" });

  const region = el("div", { class: "chips", role: "group", "aria-label": "Region" });
  let pickedRegion = "VIC";
  REGIONS.forEach((r) => region.append(el("button", {
    class: "chip", type: "button", text: r,
    "aria-pressed": r === pickedRegion ? "true" : "false",
    onclick: (e) => {
      pickedRegion = r;
      [...region.children].forEach((c) => c.setAttribute("aria-pressed", "false"));
      e.currentTarget.setAttribute("aria-pressed", "true");
    },
  })));

  const diff = el("div", { class: "chips", role: "group", "aria-label": "Difficulty" });
  let pickedDiff = "moderate";
  ["easy", "moderate", "hard"].forEach((d) => diff.append(el("button", {
    class: "chip", type: "button", text: difficultyLabel(d),
    "aria-pressed": d === pickedDiff ? "true" : "false",
    onclick: (e) => {
      pickedDiff = d;
      [...diff.children].forEach((c) => c.setAttribute("aria-pressed", "false"));
      e.currentTarget.setAttribute("aria-pressed", "true");
    },
  })));

  const tags = el("div", { class: "chips", role: "group", "aria-label": "Tags" });
  const picked = new Set(["Day hikes"]);
  TAGS.forEach((t) => tags.append(el("button", {
    class: "chip", type: "button", text: t,
    "aria-pressed": picked.has(t) ? "true" : "false",
    onclick: (e) => {
      if (picked.has(t)) picked.delete(t); else picked.add(t);
      e.currentTarget.setAttribute("aria-pressed", picked.has(t) ? "true" : "false");
    },
  })));

  /* The photo comes FIRST. It is the largest thing on the card and the
     thing people actually swipe on, so asking for it after six text
     fields would frame it as an afterthought. */
  /* NOT `picked` — that name is already the tag Set above, and
     shadowing it here is a duplicate declaration that takes the whole
     module graph down with it */
  let groupPhoto = null;
  const draftId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  wrap.append(
    el("div", { class: "block" }, [
      el("p", { class: "tiny", text: "GROUP PHOTO" }),
      photoPicker({ el, fallback: landscape(draftId), onPick: (out) => { groupPhoto = out; } }),
    ])
  );

  wrap.append(
    field("title", "Title", title),
    field("where", "Where", where),
    el("div", { class: "block" }, [el("span", { class: "tiny", text: "REGION" })]), region,
    el("div", { class: "block" }, [el("span", { class: "tiny", text: "DIFFICULTY" })]), diff,
    el("div", { class: "block" }, [el("span", { class: "tiny", text: "WHAT IT IS" })]), tags,
    field("date", "Proposed day", date),
    field("desc", "Description", desc)
  );

  wrap.append(el("div", { class: "block" }, [
    el("button", {
      class: "btn btn--primary btn--block", type: "button", text: "Post it",
      onclick: async () => {
        const t = title.value.trim();
        if (!t) { toast("It needs a title"); title.focus(); say("It needs a title."); return; }
        const id = draftId;
        const row = {
          id, host_id: meId, title: t,
          /* the generated artwork is the fallback, not the plan */
          photo_url: landscape(id),
          description: desc.value.trim(),
          region: pickedRegion,
          location_name: where.value.trim(),
          difficulty: pickedDiff,
          tags: [...picked],
          proposed_date: date.value || null,
          status: "open",
        };
        /* ⚠️ Upload first, but never let it cost the hike. If storage
           refuses, the group is still created with generated artwork
           and the person is told — losing everything they typed
           because a photo failed would be the worse outcome by far. */
        if (groupPhoto) {
          try {
            row.photo_url = await DB.upload(groupPhoto.blob, `group-${id}.jpg`);
          } catch (err) {
            console.warn("[host] photo upload failed", err);
            toast("Couldn't upload the photo — posting with artwork for now");
          }
        }

        const saved = await DB.insert("hikes", row);
        await DB.upsert("hike_members", { hike_id: saved.id || id, user_id: meId, status: "joined" }, ["hike_id", "user_id"]);
        await DB.insert("messages", { hike_id: saved.id || id, user_id: meId, kind: "system", body: "You created this hike" });
        toast("Posted");
        say(`${t} is live. People can find it now.`);
        go(`hike/${saved.id || id}`);
      },
    }),
    el("p", { class: "tiny", style: "margin-top:10px", text: "You can change the photo later from the hike page." }),
  ]));

  return wrap;
}

/* ---------------- a region from the map ---------------- */
export async function region({ id }) {
  const code = (id || "VIC").toUpperCase();
  const [hikes, profiles, members] = await Promise.all([
    DB.list("hikes", { filter: { region: code } }),
    DB.list("profiles"),
    DB.list("hike_members"),
  ]);
  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));

  const wrap = el("div");
  wrap.append(
    el("div", { class: "topbar topbar--left" }, [
      el("button", { class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back", html: icon("back", { size: 20 }), onclick: back }),
      el("h1", { class: "display", style: "font-size:1.4rem", text: regionName(code) }),
    ])
  );

  if (!hikes.length) {
    wrap.append(el("div", { class: "block" }, [
      el("div", { class: "card", style: "text-align:center;padding:28px" }, [
        el("p", { class: "display", style: "font-size:1.2rem", text: "Nothing here yet" }),
        el("p", { class: "meta", style: "margin-top:6px", text: `No one has posted a walk in ${regionName(code)}. You could be the first.` }),
        el("button", { class: "btn btn--primary", style: "margin-top:14px", type: "button", text: "Host one here", onclick: () => go("host") }),
      ]),
    ]));
    return wrap;
  }

  wrap.append(el("div", { class: "stack" }, hikes.map((h) => {
    const n = members.filter((m) => m.hike_id === h.id && m.status !== "left").length;
    return el("button", { class: "row", type: "button", onclick: () => go(`hike/${h.id}`) }, [
      avatar((byId[h.host_id] || {}).avatar_url, (byId[h.host_id] || {}).display_name),
      el("span", { class: "row__body" }, [
        el("span", { class: "row__title", text: h.title.split("—")[0].trim() }),
        el("span", { class: "row__sub", text: `${fmtShortDate(h.confirmed_date || h.proposed_date)} · ${difficultyLabel(h.difficulty)} · ${n} going` }),
      ]),
      el("span", { class: "iconbtn", html: icon("arrow", { size: 20 }) }),
    ]);
  })));

  return wrap;
}
