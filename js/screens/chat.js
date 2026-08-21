/* ============================================================
   Biomate — the group chat thread

   The design library had no messaging reference, so the personality
   here is built from Biomate's own vocabulary rather than borrowed:
   bubbles inherit the peach card gradient, your own are terracotta,
   system events are a centred hairline rule with the text sitting on
   it, and the composer is the same pill shape as every other control.

   The header carries the two things the whiteboard wanted off the
   permanent planning chat: the plan, and availability.
   ============================================================ */

import { DB } from "../db.js";
import { el, avatar, toast } from "../ui.js";
import { icon } from "../icons.js";
import { say } from "../a11y.js";
import { go, back } from "../router.js";

export async function chat({ id }) {
  const meId = DB.uid();
  const [rows, members, msgs, profiles] = await Promise.all([
    DB.list("hikes", { filter: { id }, limit: 1 }),
    DB.list("hike_members", { filter: { hike_id: id } }),
    DB.list("messages", { filter: { hike_id: id }, order: "created_at" }),
    DB.list("profiles"),
  ]);

  const h = rows[0];
  if (!h) return el("p", { class: "meta", style: "padding:40px 20px", text: "That conversation no longer exists." });

  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const joined = members.filter((m) => m.status !== "left");

  const wrap = el("div", { class: "chat" });

  /* ---- header ---- */
  wrap.append(
    el("div", { class: "topbar" }, [
      el("button", { class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back", html: icon("back", { size: 20 }), onclick: back }),
      el("button", { class: "chat__title", type: "button", onclick: () => go(`hike/${h.id}`) }, [
        el("span", { class: "avstack" }, joined.slice(0, 3).map((m) => avatar((byId[m.user_id] || {}).avatar_url, (byId[m.user_id] || {}).display_name || "?"))),
        el("span", {}, [
          el("span", { class: "row__title", text: h.title.split("—")[0].trim() }),
          el("span", { class: "row__sub", text: `${joined.length} ${joined.length === 1 ? "person" : "people"}` }),
        ]),
      ]),
    ])
  );

  /* ---- the two buttons the whiteboard hangs off the planning chat ---- */
  wrap.append(
    el("div", { class: "chat__tools" }, [
      el("button", { class: "btn btn--ghost", type: "button", html: `${icon("calendar", { size: 18 })}<span>Plan</span>`, onclick: () => go(`plan/${h.id}`) }),
      el("button", { class: "btn btn--ghost", type: "button", html: `${icon("clock", { size: 18 })}<span>Availability</span>`, onclick: () => go(`when/${h.id}`) }),
    ])
  );

  /* ---- the thread ---- */
  const list = el("div", { class: "thread", role: "log", "aria-label": "Messages", "aria-live": "polite" });
  msgs.forEach((m) => list.append(bubble(m, byId, meId)));
  if (!msgs.length) {
    list.append(el("p", { class: "meta", style: "text-align:center;padding:30px 10px", text: "Nobody's said anything yet. You could be first." }));
  }
  wrap.append(list);

  /* ---- composer ---- */
  const input = el("input", {
    class: "composer__input",
    type: "text",
    id: "composer",
    autocomplete: "off",
    placeholder: "Message the group…",
    "aria-label": "Write a message",
  });

  const send = async () => {
    const body = input.value.trim();
    if (!body) return;
    input.value = "";
    const row = await DB.insert("messages", { hike_id: h.id, user_id: meId, body, kind: "text" });
    list.append(bubble(row, byId, meId));
    list.scrollTop = list.scrollHeight;
    say("Sent.");
  };

  const form = el("form", {
    class: "composer",
    onsubmit: (e) => { e.preventDefault(); send(); },
  }, [
    input,
    el("button", { class: "composer__send", type: "submit", "aria-label": "Send message", html: icon("send", { size: 20 }) }),
  ]);
  wrap.append(form);

  /* jump to the newest message once the screen is in the document */
  requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });

  return wrap;
}

function bubble(m, byId, meId) {
  if (m.kind === "system") {
    return el("p", { class: "sysline" }, [el("span", { text: m.body })]);
  }
  const mine = m.user_id === meId;
  const who = byId[m.user_id] || { display_name: "someone" };

  return el("div", { class: `msg ${mine ? "msg--mine" : ""}` }, [
    mine ? null : avatar(who.avatar_url, who.display_name),
    el("div", { class: "msg__body" }, [
      mine ? null : el("span", { class: "msg__who", text: who.display_name }),
      el("p", { class: "msg__text", text: m.body }),
    ]),
  ]);
}
