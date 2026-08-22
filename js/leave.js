/* ============================================================
   Biomate — leaving a group

   ⚠️ ONE home now, not two. It used to sit in the chat header as
   well, and Aufan's note was that it read as too conspicuous there —
   fair: a way OUT of a conversation should not be one of the first
   things you see while reading it. The route in is the group's name at
   the top of the chat, which already opens the hike page.
   It lives in its own module because the ORDER OF THE TWO WRITES
   matters, and an order that has to be right in two screens is an
   order that ends up wrong in one of them.

   ⚠️ The system message is posted FIRST and the membership row is
   flipped second. Both directions on `messages` are members-only,
   so a row already marked `left` can no longer write into the
   thread it just left — do it the other way round and the write is
   refused by the server and the group never finds out who walked
   away. Offline the order is harmless; online it is the whole
   feature. This is exactly the class of bug that only shows up
   once the app is live, so it is written down rather than
   remembered.

   The confirm is inline rather than a dialog. A leave button in a
   chat header is a mis-tap waiting to happen — but a modal for one
   yes/no question is a focus trap, a scroll lock and an overlay to
   maintain, for one sentence. So the control becomes its own
   question in place, the way the swipe deck repaints instead of
   opening anything. Escape backs out, and focus follows the swap
   both ways so a keyboard user is never left pointing at an
   element that no longer exists.

   The host is not offered a way out and is TOLD why. Silently
   hiding the button would read as a missing feature, and the next
   person to open this file would "fix" it.
   ============================================================ */

import { DB } from "./db.js";
import { el, toast } from "./ui.js";
import { icon } from "./icons.js";
import { say } from "./a11y.js";
import { go } from "./router.js";

/** The hike's short name — the part before the em dash, as everywhere else. */
const shortTitle = (h) => String(h.title || "this hike").split("—")[0].trim();

function note(text) {
  return el("p", { class: "leavebar__note" }, [
    el("span", { class: "leavebar__ic", html: icon("alert", { size: 16 }), "aria-hidden": "true" }),
    el("span", { text }),
  ]);
}

/**
 * The leave control, or null when there is nothing to say.
 *
 * @param {object}   o
 * @param {object}   o.hike     the hike row
 * @param {object[]} o.members  every hike_members row for THIS hike
 * @param {string}   o.meId     DB.uid()
 * @param {string}   o.myName   your display name — it goes in the system message
 * @param {"chat"|"hike"} o.context  where the control is being mounted
 * @returns {HTMLElement|null}
 */
export function leaveControl({ hike, members, meId, myName, context = "chat" }) {
  const iAmHost = hike.host_id === meId;
  const iAmIn = members.some((m) => m.user_id === meId && m.status !== "left");
  const short = shortTitle(hike);

  /* On the hike page a non-member already has "ask to join" as the
     one primary action; a second line about a group they are not in
     would be noise. In the chat it is worth saying, because being
     able to read a thread you have left is confusing otherwise. */
  if (!iAmHost && !iAmIn && context === "hike") return null;

  const bar = el("div", { class: "leavebar leavebar--block" });

  if (iAmHost) {
    bar.append(note(`You're hosting ${short}, so you can't leave it — everyone who joined would be left without a host.`));
    return bar;
  }

  /* ⚠️ Checked against the live policies, not assumed: `messages` is
     gated by private.is_member(), which is `status <> 'left'`. So
     leaving takes READ access away too, not just posting. An earlier
     version of this line promised "you can still read what was said" —
     true against the local driver, refused by the server. The copy now
     matches what the database actually does. That is the right way
     round: keeping an ex-member's window into a group's future
     conversation would be the worse design, so the UI moves, not the
     policy. */
  if (!iAmIn) {
    bar.append(
      note("You've left this group, so its messages are no longer yours to read."),
      el("button", {
        class: "linky",
        type: "button",
        /* the hike page's primary action reads "Rejoin this group" once
           it can see you left, so this link lands on something that
           actually offers the way back rather than pitching the hike
           to you as though you had never been in it */
        text: "Open the hike to rejoin",
        onclick: () => go(`hike/${hike.id}`),
      })
    );
    return bar;
  }

  const QUESTION = "Leave this group? You'll stop getting its messages.";

  const leaveBtn = el("button", {
    /* red, because it is the one destructive thing on the page and
       colour is the fastest way to say so — but outlined rather than
       filled, so it never competes with the primary action above it */
    class: "btn btn--leave",
    type: "button",
    "aria-label": `Leave ${short}`,
    html: `${icon("close", { size: 16 })}<span>Leave group</span>`,
    onclick: () => ask(),
  });

  function rest(refocus) {
    bar.replaceChildren(leaveBtn);
    if (refocus) leaveBtn.focus();
  }

  function ask() {
    const stay = el("button", {
      class: "btn btn--ghost",
      type: "button",
      text: "Stay",
      onclick: () => { rest(true); say("Still in the group."); },
    });

    const confirmBtn = el("button", {
      class: "btn btn--leave",
      type: "button",
      text: "Leave",
      "aria-label": `Yes, leave ${short}`,
      onclick: () => commit(confirmBtn, stay),
    });

    bar.replaceChildren(el("p", { class: "leavebar__q", text: QUESTION }), stay, confirmBtn);
    confirmBtn.focus();
    say(QUESTION);
  }

  /* Escape is the standard way out of a question, and it costs one
     listener on the bar rather than one per rendered button. */
  bar.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (bar.contains(leaveBtn)) return;
    e.stopPropagation();
    rest(true);
    say("Still in the group.");
  });

  async function commit(confirmBtn, stay) {
    confirmBtn.disabled = true;
    stay.disabled = true;
    try {
      /* order matters — see the note at the top of this file */
      await DB.insert("messages", {
        hike_id: hike.id,
        user_id: meId,
        kind: "system",
        body: `${myName || "Someone"} left the group`,
      });
      await DB.update("hike_members", { hike_id: hike.id, user_id: meId }, { status: "left" });
    } catch (err) {
      console.warn("[leave] could not leave the group", err);
      confirmBtn.disabled = false;
      stay.disabled = false;
      toast("Couldn't leave — try again");
      say("That didn't work. You are still in the group.");
      return;
    }
    toast("You left the group");
    say(`You left ${short}.`);
    go("messages");
  }

  rest(false);
  return bar;
}
