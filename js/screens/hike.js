/* ============================================================
   Biomate — a single hike ("Upcoming Event" in the Figma)

   Hero photo with a bookmark, a Details block of icon+fact rows, the
   host's description in their own voice, and one primary action that
   changes with your relationship to the hike:
     not a member  → Ask to join
     member        → Open the group chat
     host          → Manage
   ============================================================ */

import { DB } from "../db.js";
import { el, photo, avatar, toast, fmtDate, difficultyLabel } from "../ui.js";
import { icon } from "../icons.js";
import { say } from "../a11y.js";
import { go, back } from "../router.js";
import { personBadge } from "../appbar.js";
import { leaveControl } from "../leave.js";

export async function hike({ id }) {
  const meId = DB.uid();
  const [rows, members, profiles, stats] = await Promise.all([
    DB.list("hikes", { filter: { id }, limit: 1 }),
    DB.list("hike_members", { filter: { hike_id: id } }),
    DB.list("profiles"),
    DB.allStats(),
  ]);
  const h = rows[0];
  if (!h) return notFound();

  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const joined = members.filter((m) => m.status !== "left");
  const iAmIn = joined.some((m) => m.user_id === meId);
  /* someone who was here and left — the action below has to say
     "rejoin", not pitch the hike to them as if they had never seen it */
  const iLeft = !iAmIn && members.some((m) => m.user_id === meId && m.status === "left");
  const iAmHost = h.host_id === meId;
  const host = byId[h.host_id] || { display_name: "someone" };
  const others = joined.filter((m) => m.user_id !== h.host_id);

  const wrap = el("div");

  wrap.append(
    el("div", { class: "topbar topbar--left" }, [
      el("button", { class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back", html: icon("back", { size: 20 }), onclick: back }),
      el("span", { style: "flex:1" }),
      avatar(host.avatar_url, host.display_name),
    ])
  );

  wrap.append(el("h1", { class: "pagetitle", text: h.title }));

  /* hero */
  const hero = el("div", { class: "hero" }, [
    photo(h.photo_url, `Photo for ${h.title}`, "hero__img", h.id),
    el("button", {
      class: "hero__save", type: "button", "aria-pressed": "false",
      "aria-label": "Save this hike", html: icon("bookmark", { size: 18 }),
      onclick: (e) => {
        const b = e.currentTarget;
        const on = b.getAttribute("aria-pressed") === "true";
        b.setAttribute("aria-pressed", on ? "false" : "true");
        say(on ? "Removed from saved" : "Saved");
      },
    }),
  ]);
  wrap.append(hero);
  /* CC BY-SA images require attribution, and it costs one line */
  if (h.photo_credit) {
    wrap.append(el("p", { class: "tiny", style: "padding:6px 20px 0", text: `Photo: ${h.photo_credit}` }));
  }

  /* details */
  const detail = (ic, text, extra) =>
    el("div", { class: "detail" }, [
      el("span", { class: "detail__ic", html: icon(ic, { size: 20 }) }),
      el("span", { text }),
      extra || null,
    ]);

  wrap.append(
    el("section", { class: "block" }, [
      el("h2", { class: "h2", text: "Details" }),
      detail("calendar", h.confirmed_date ? fmtDate(h.confirmed_date) : `${fmtDate(h.proposed_date)} (proposed)`),
      el("div", { class: "detail" }, [
        el("span", { class: "detail__ic", html: icon("people", { size: 20 }) }),
        el("span", { text: others.length
          ? `${host.display_name} and ${others.length} other${others.length === 1 ? "" : "s"}`
          : `${host.display_name} — first one in` }),
        personBadge(stats[h.host_id]),
      ]),
      detail("alert", `Difficulty: ${difficultyLabel(h.difficulty)}`),
      detail("pin", h.location_name || h.region),
    ])
  );

  /* who's coming */
  if (joined.length) {
    wrap.append(
      el("section", { class: "block" }, [
        el("h2", { class: "h2", text: "Who's coming" }),
        el("div", { class: "avstack" }, [
          ...joined.slice(0, 5).map((m) =>
            el("button", {
              class: "avstack__btn",
              type: "button",
              "aria-label": `Open ${(byId[m.user_id] || {}).display_name || "this person"}'s profile`,
              onclick: () => go(`person/${m.user_id}`),
            }, [avatar((byId[m.user_id] || {}).avatar_url, (byId[m.user_id] || {}).display_name || "?")])),
          joined.length > 5 ? el("span", { class: "avstack__more", text: `+${joined.length - 5} more` }) : null,
        ]),
      ])
    );
  }

  /* description, in the host's own voice — newlines preserved */
  if (h.description) {
    wrap.append(
      el("section", { class: "block" }, [
        el("h2", { class: "h2", text: "Description" }),
        el("p", { class: "prose", text: h.description }),
      ])
    );
  }

  /* the one action */
  const action = iAmHost
    ? el("button", { class: "btn btn--primary btn--block", type: "button", text: "Open the group chat", onclick: () => go(`chat/${h.id}`) })
    : iAmIn
      ? el("button", { class: "btn btn--primary btn--block", type: "button", text: "Open the group chat", onclick: () => go(`chat/${h.id}`) })
      : el("button", {
          class: "btn btn--primary btn--block",
          type: "button",
          html: iLeft ? "Rejoin this group" : `Message <b>${host.display_name}</b> to RSVP`,
          onclick: async () => {
            /* upsert, not insert, and the conflict key is the pair —
               so someone who left and came back has their EXISTING row
               flipped back to joined. An insert would leave two rows
               for one person in one group, and every count on every
               screen would quietly read one too many. */
            await DB.upsert("hike_members", { hike_id: h.id, user_id: meId, status: "joined" }, ["hike_id", "user_id"]);
            toast(iLeft ? "You're back in" : "You're in");
            say(`${iLeft ? "Rejoined" : "Joined"} ${h.title}. Opening the group chat.`);
            go(`chat/${h.id}`);
          },
        });

  wrap.append(el("div", { class: "block" }, [action]));

  /* the way out sits under the one action, never beside it — leaving
     is never the thing you came to this page to do */
  const leave = leaveControl({
    hike: h,
    members,
    meId,
    myName: (byId[meId] || {}).display_name,
    context: "hike",
  });
  if (leave) wrap.append(leave);

  return wrap;
}

function notFound() {
  return el("div", { class: "stack", style: "padding-top:60px" }, [
    el("h1", { class: "display", text: "That hike is gone" }),
    el("p", { class: "meta", text: "It may have been cancelled, or the link is old." }),
    el("a", { class: "btn btn--primary", href: "#/matchmaker", text: "Find another" }),
  ]);
}
