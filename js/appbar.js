/* ============================================================
   Biomate — the top bar

   Aufan: "there should be streak on the top right bar, like streak
   gained from everyday login", and levels visible so people can see
   experience and who is active.

   So the bar carries four things and nothing else:
     · the mark, so you always know where you are
     · whether you are signed in — and if not, the way to be
     · your level
     · your streak

   The account control is here because Aufan asked for it to be
   explicit and at the top: "so people know they can either sign in or
   login". It was previously only findable on the profile screen and
   inside settings, which means a first-time visitor had no way of
   knowing accounts existed at all.

   ⚠️ The streak stays the RIGHTMOST thing, because that was the
   original instruction ("streak on the top right bar") and it has not
   changed. The account control sits just left of the chips: distinct
   enough to read as the action, without taking the corner.

   The connection state used to be a full sentence taking a whole row.
   It is now a coloured dot with the sentence as its accessible name —
   same information, none of the space, and still announced.
   ============================================================ */

import { el } from "./ui.js";
import { levelFor } from "./levels.js";
import { go } from "./router.js";
import { DB } from "./db.js";
import * as Auth from "./auth.js";

export function mark(size = 26) {
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true" focusable="false">
    <circle cx="24" cy="24" r="21" fill="var(--cream)" stroke="var(--brand-text)" stroke-width="3.4"/>
    <path d="M14 32 Q20 30 24 24 Q28 18 34 16" fill="none" stroke="var(--ink-soft)" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="14" cy="32" r="4.6" fill="var(--brand)"/>
    <circle cx="24" cy="24" r="4.6" fill="var(--amber)"/>
    <circle cx="34" cy="16" r="4.6" fill="var(--forest)"/>
  </svg>`;
}

/** A flame that only fills in once the streak is real. */
function flame(lit) {
  return `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false"
      fill="${lit ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.7"
      stroke-linejoin="round" opacity="${lit ? 1 : 0.55}">
    <path d="M12 3s4.6 3.9 4.6 8.1a4.6 4.6 0 0 1-9.2 0c0-1.6.8-3 .8-3S9 11.2 10.2 11.2c1.4 0 1.6-2.6 1.8-8.2Z"/>
  </svg>`;
}

let bar = null;
let state = { status: { driver: "local", degraded: false }, xp: 0, streak: 0 };

export function mountAppbar() {
  bar = document.getElementById("appbar");
  return bar;
}

export function setAppbarState(patch) {
  Object.assign(state, patch);
  renderAppbar(state.status, state);
}

/** Re-read XP after something that could have earned some. */
export async function refreshAppbar() {
  try {
    const s = await DB.statsFor(DB.uid());
    state.xp = s.xp || 0;
    if (typeof s.streak === "number") state.streak = s.streak;
    renderAppbar(state.status, state);
  } catch (err) {
    console.warn("[appbar] refresh failed", err);
  }
}

/**
 * @param {{driver:string,degraded:boolean}} status
 * @param {{xp:number,streak:number}} stats
 */
export function renderAppbar(status, stats) {
  if (!bar) return;
  const live = status.driver === "supabase" && !status.degraded;
  const lv = levelFor(stats.xp || 0);
  const streak = stats.streak || 0;

  bar.replaceChildren(
    el("button", {
      class: "appbar__brand",
      type: "button",
      "aria-label": "Biomate, go home",
      onclick: () => go("home"),
    }, [
      el("span", { html: mark(26), "aria-hidden": "true" }),
      el("span", { class: "appbar__word", text: "Biomate" }),
    ]),

    el("span", {
      class: `appbar__dot ${live ? "" : "appbar__dot--warn"}`,
      role: "img",
      "aria-label": live
        ? "Connected. Your hikes are shared with everyone."
        : "Local mode. Everything is saved on this device only.",
      title: live ? "Connected" : "Local mode — saved on this device only",
    }),

    el("span", { style: "flex:1" }),

    accountControl(),

    /* level — the "how experienced is this person" signal */
    el("button", {
      class: "chipstat chipstat--level",
      type: "button",
      "aria-label": `Level ${lv.level}, ${lv.name}, ${lv.xp} XP. Open your profile.`,
      onclick: () => go("profile"),
    }, [
      el("span", { class: "chipstat__lv", text: `Lv ${lv.level}` }),
      el("span", { class: "chipstat__name", text: lv.name }),
    ]),

    /* streak — the "is this person still turning up" signal */
    el("span", {
      class: `chipstat chipstat--streak ${streak ? "is-lit" : ""}`,
      role: "img",
      "aria-label": streak
        ? `${streak} day streak. Come back tomorrow to keep it.`
        : "No streak yet. Open Biomate two days running to start one.",
      title: streak ? `${streak}-day streak` : "No streak yet",
      html: `${flame(streak > 0)}<b>${streak}</b>`,
    })
  );
}

/* ---------------- signed in, or the way to be ----------------
   Nothing at all on the local driver: there are no accounts there, and
   a sign-in button that leads to "this copy has no accounts" is worse
   than no button. */
function accountControl() {
  if (!DB.isLive) return null;

  const a = Auth.account();

  if (a.signedIn) {
    /* Once you are in, this is identification rather than an action, so
       it shrinks to a single letter. The email is in the accessible
       name and the title — putting a whole address in a 375px bar
       would push the streak off the edge. */
    const letter = (a.email || "?").trim().charAt(0).toUpperCase();
    return el("button", {
      class: "acctbtn acctbtn--in",
      type: "button",
      "aria-label": `Signed in as ${a.email}. Open your account.`,
      title: a.email,
      onclick: () => go("account"),
    }, [el("span", { "aria-hidden": "true", text: letter })]);
  }

  return el("button", {
    class: "acctbtn",
    type: "button",
    /* the visible word is "Sign in" because it has to fit; the
       accessible name says both, because a guest's real question is
       whether they can have an account at all */
    "aria-label": a.awaitingConfirmation
      ? `Finish setting up your account — confirm the email sent to ${a.email}.`
      : "Sign in, or create an account",
    title: "Sign in or create an account",
    onclick: () => go("account"),
  }, [el("span", { text: a.awaitingConfirmation ? "Confirm" : "Sign in" })]);
}

/* ---------------- a level/streak badge for OTHER people ----------------
   Same two signals, small enough to sit next to a name in a list. */
export function personBadge(stats) {
  if (!stats) return null;
  const lv = levelFor(stats.xp || 0);
  const streak = stats.streak || 0;
  return el("span", {
    class: "pbadge",
    "aria-label": `Level ${lv.level}, ${lv.name}${streak ? `, ${streak} day streak` : ""}`,
  }, [
    el("span", { class: "pbadge__lv", text: `Lv ${lv.level}` }),
    streak >= 3
      ? el("span", { class: "pbadge__streak", html: `${flame(true)}<b>${streak}</b>` })
      : null,
  ]);
}
