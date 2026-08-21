/* ============================================================
   Biomate — the top bar

   Aufan: "there should be streak on the top right bar, like streak
   gained from everyday login", and levels visible so people can see
   experience and who is active.

   So the bar carries three things and nothing else:
     · the mark, so you always know where you are
     · your level
     · your streak

   The connection state used to be a full sentence taking a whole row.
   It is now a coloured dot with the sentence as its accessible name —
   same information, none of the space, and still announced.
   ============================================================ */

import { el } from "./ui.js";
import { levelFor } from "./levels.js";
import { go } from "./router.js";
import { DB } from "./db.js";

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
