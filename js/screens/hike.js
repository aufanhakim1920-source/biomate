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
import { joinedHike } from "../fx.js";
import { prepare } from "../photo.js";

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
  /* Roles: the LEADER is hikes.host_id — one per hike, so it cannot
     disagree with itself. Co-leader is a flag on the membership row.
     Both may edit the hike; only the leader may change who is which. */
  const myRow = members.find((m) => m.user_id === meId && m.status !== "left");
  const iAmCoLeader = Boolean(myRow && myRow.role === "coleader");
  const canLead = iAmHost || iAmCoLeader;
  const roleOf = (uid) =>
    uid === h.host_id ? "leader"
      : (members.find((m) => m.user_id === uid && m.status !== "left") || {}).role === "coleader" ? "coleader"
      : "member";
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

  /* who's coming — with who runs it, and the leader's controls */
  if (joined.length) {
    const ROLE_LABEL = { leader: "Leader", coleader: "Co-leader", member: "" };

    const peopleList = el("div", { class: "stack", style: "padding:0" });

    const drawPeople = () => {
      /* leader first, then co-leaders, then everyone else — the list
         answers "who runs this" before it answers "who else is coming" */
      const order = { leader: 0, coleader: 1, member: 2 };
      const sorted = [...joined].sort((a, b) => order[roleOf(a.user_id)] - order[roleOf(b.user_id)]);

      peopleList.replaceChildren(...sorted.map((m) => {
        const who = byId[m.user_id] || { display_name: "someone" };
        const role = roleOf(m.user_id);

        /* Only the leader changes roles, and never their own — a hike
           without a leader is a hike nobody can fix. */
        const canPromote = iAmHost && m.user_id !== h.host_id;
        const next = role === "coleader" ? "member" : "coleader";

        return el("div", { class: "personrow" }, [
          el("button", {
            class: "row", type: "button", style: "flex:1",
            "aria-label": `Open ${who.display_name}'s profile`,
            onclick: () => go(`person/${m.user_id}`),
          }, [
            avatar(who.avatar_url, who.display_name),
            el("span", { class: "row__body" }, [
              el("span", { class: "row__title" }, [
                el("span", { text: who.display_name }),
                role !== "member" ? el("span", { class: `rolechip rolechip--${role}`, text: ROLE_LABEL[role] }) : null,
                personBadge(stats[m.user_id]),
              ]),
              el("span", { class: "row__sub", text: who.home_area || "" }),
            ]),
          ]),
          canPromote
            ? el("button", {
                class: "btn btn--ghost rolebtn", type: "button",
                text: role === "coleader" ? "Step down" : "Make co-leader",
                "aria-label": role === "coleader"
                  ? `Remove ${who.display_name} as co-leader`
                  : `Make ${who.display_name} a co-leader`,
                onclick: async (e) => {
                  const b = e.currentTarget;
                  b.disabled = true;
                  try {
                    await DB.update("hike_members", { hike_id: h.id, user_id: m.user_id }, { role: next });
                    const row = members.find((x) => x.user_id === m.user_id && x.hike_id === h.id);
                    if (row) row.role = next;
                    drawPeople();
                    toast(next === "coleader" ? `${who.display_name} is a co-leader` : `${who.display_name} stepped down`);
                    say(next === "coleader"
                      ? `${who.display_name} can now edit this hike.`
                      : `${who.display_name} is a member again.`);
                  } catch (err) {
                    console.warn("[hike] role change failed", err);
                    b.disabled = false;
                    toast("Couldn't change that — try again");
                  }
                },
              })
            : null,
        ]);
      }));
    };
    drawPeople();

    wrap.append(
      el("section", { class: "block" }, [
        el("h2", { class: "h2", text: "Who's coming" }),
        iAmHost
          ? el("p", { class: "tiny", style: "padding-bottom:6px", text: "A co-leader can edit the hike and its photo. Only you can choose who." })
          : null,
        peopleList,
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
            /* The toast is gone from this path: joining is the single
               most important yes in the app and it was being reported
               in the same grey pill as "Profile saved". It gets a
               moment now — and the moment does the say() itself. */
            joinedHike(h, { rejoined: iLeft });
            /* the chat opens a beat later than the panel, so the
               celebration is not immediately wiped by a navigation */
            setTimeout(() => go(`chat/${h.id}`), 700);
          },
        });

  /* ---- the host can change the group photo ----
     The Start a group screen tells people they can do this here, so it
     has to be here. Host only: the photo is what everyone else swipes
     on, and it is not a thing any member should be able to replace. */
  if (canLead) {
    const input = el("input", { class: "sr-only", type: "file", id: "hike-photo", accept: "image/*" });
    const status = el("p", { class: "tiny", style: "padding-top:8px" });
    const label = el("label", { class: "btn btn--ghost btn--block", for: "hike-photo" }, [
      el("span", { text: h.photo_url && !/^data:/.test(h.photo_url) ? "Change the group photo" : "Add a group photo" }),
    ]);

    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      status.textContent = "Reading the photo…";
      try {
        const out = await prepare(file);
        status.textContent = "Uploading…";
        const url = await DB.upload(out.blob, `group-${h.id}.jpg`);
        await DB.update("hikes", { id: h.id }, { photo_url: url });
        /* show it immediately rather than making them reload to find
           out whether it worked */
        const img = wrap.querySelector(".hero__img");
        if (img) { img.src = url; img.alt = `Photo for ${h.title}`; }
        status.textContent = `Updated — ${Math.round(out.bytes / 1024)} KB.`;
        toast("Group photo updated");
        say("Group photo updated.");
      } catch (err) {
        console.warn("[hike] photo update failed", err);
        status.textContent = err.message || "That didn't upload. Try again.";
        input.value = "";
      }
    });

    wrap.append(el("div", { class: "block", style: "padding-top:0" }, [label, input, status]));
  }

  wrap.append(el("div", { class: "block" }, [action]));

  /* Recording is offered only to people actually on the hike, and only
     from here — starting it from the hike is what attaches the saved
     walk to this group, so "who was there" has an answer later. */
  if (iAmHost || iAmIn) {
    wrap.append(
      el("div", { class: "block", style: "padding-top:0" }, [
        el("button", {
          class: "btn btn--ghost btn--block",
          type: "button",
          html: `${icon("route", { size: 18 })}<span>Record this walk</span>`,
          onclick: () => go(`trail/${h.id}`),
        }),
      ])
    );
  }

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
