/* ============================================================
   Biomate — celebration effects

   One-shot only. Nothing loops, nothing drifts, and everything here
   checks prefers-reduced-motion first — ambient motion is the one
   thing Aufan has consistently said makes him nauseous, and a
   reward animation that keeps playing stops being a reward.

   ⚠️ THE THING THAT ACTUALLY CAUSES THE NAUSEA is density, not
   duration: "those particles are too stimulating" — many small
   elements moving independently at once, with nothing for the eye
   to fix on. So there is deliberately NO CONFETTI in this file, and
   there never will be. The test is *can you point at what is
   moving?* One panel arriving is one thing. Sixty pieces of paper
   are a texture. Every effect below is a single element, on a single
   path, that stops.

   ⚠️ Every transient node gets a setTimeout fallback next to its
   animationend listener. If an element never animates — reduced
   motion, a hidden tab, display:none — animationend never fires and
   the node lives forever. That leak was measured on Peak & Pan:
   28 pieces still in the DOM 2.4s after the effect "finished".

   ---- Reduced motion is REDUCED, not REMOVED ----------------
   The old version returned early and showed nothing at all, which
   quietly meant a reduced-motion visitor was the only person in the
   app who could not see they had levelled up. Now the panel still
   appears — it just does not animate, and it stays a little longer
   to make up for having no entrance to catch the eye. Decoration
   (the flying XP chip) is still skipped outright, because there is
   no information in it.

   ---- Every moment is keyboard-dismissible -------------------
   Escape closes whatever is on screen, each panel carries a real
   <button>, and focus is put back where it came from. Nothing here
   traps focus: none of it is a modal, and stealing focus to
   announce good news would interrupt whatever the person was
   actually doing. The text always goes through say() too, so the
   panel is never the only place the information exists.
   ============================================================ */

import { el } from "./ui.js";
import { say, reducedMotion } from "./a11y.js";
import { play } from "./sound.js";

function transient(node, ms) {
  document.body.append(node);
  const kill = () => node.remove();
  node.addEventListener("animationend", kill, { once: true });
  setTimeout(kill, ms);            // the fallback that stops the leak
}

/**
 * "+25 XP" flying from wherever it was earned up to the level chip.
 * Pure decoration — it carries no information the chip does not
 * already show — so this one really is skipped under reduced motion.
 * @param {number} amount
 * @param {HTMLElement} [from]
 */
export function xpBurst(amount, from) {
  if (!amount) return;
  say(`Plus ${amount} X P.`);
  if (reducedMotion()) return;

  const target = document.querySelector(".chipstat--level");
  const start = (from || target || document.body).getBoundingClientRect();
  const end = target ? target.getBoundingClientRect() : { left: window.innerWidth - 80, top: 20 };

  const chip = el("span", { class: "fx-xp", text: `+${amount} XP` });
  chip.style.left = `${start.left + start.width / 2}px`;
  chip.style.top = `${start.top + start.height / 2}px`;
  chip.style.setProperty("--dx", `${end.left + end.width / 2 - (start.left + start.width / 2)}px`);
  chip.style.setProperty("--dy", `${end.top + end.height / 2 - (start.top + start.height / 2)}px`);
  transient(chip, 1400);

  if (target) {
    target.classList.remove("is-bumped");
    void target.offsetWidth;
    target.classList.add("is-bumped");
  }
}

/* ============================================================
   The moment — one primitive, five occasions

   Before this, a level-up was a big centred card, a badge was a
   bottom pill, and joining a hike was a toast. Three different
   grammars for the same kind of event, and the level card and the
   badge pill could land on screen at the same time and overlap.

   Now they are one component in one stack, and the ONLY things that
   vary are the tone (which changes the colour and the cue) and the
   words. The stack is what stops two of them fighting for the same
   30 pixels — they queue vertically instead.
   ============================================================ */

let stack = null;

function stackEl() {
  if (stack && stack.isConnected) return stack;
  stack = el("div", { class: "fx-stack" });
  document.body.append(stack);
  return stack;
}

/* One document-level Escape handler for however many panels are up,
   attached only while at least one is. A listener per panel would
   mean four handlers racing to close the same thing. */
let open = 0;
function onKey(e) {
  if (e.key !== "Escape") return;
  const live = [...stackEl().children];
  if (!live.length) return;
  e.stopPropagation();
  live.forEach((n) => n.__close && n.__close());
}

/**
 * @param {object} o
 * @param {string} o.tone      "join" | "badge" | "level" | "walk" | "streak"
 * @param {string} o.kicker    the small line above — what kind of thing this is
 * @param {string} o.headline  the thing itself
 * @param {string} [o.sub]     one supporting line, optional
 * @param {string} [o.spoken]  what assistive tech hears; defaults to kicker + headline
 * @param {Node}   [o.art]     a 34px badge/ring/glyph on the left
 * @param {string} [o.sound]   cue name in js/sound.js
 * @param {number} [o.ms]      how long before it leaves on its own
 * @param {boolean} [o.force]  speak aloud even with audio description off.
 *        Exactly one caller sets this — see walkFinished. Do not add
 *        a second without a reason as good as "the phone is in a
 *        pocket and nobody is looking at the screen".
 */
export function moment({ tone = "join", kicker, headline, sub, spoken, art, sound, ms = 3200, force = false }) {
  /* Said FIRST, and said whether or not the panel is drawn. The live
     region is the channel that works for a real screen reader, and it
     is the reason none of this is "the only way to find out".

     ⚠️ NOT forced. say(text, true) speaks aloud even when audio
     description is off — which is exactly the "a shared link makes
     noise at someone" failure this whole feature is written to
     avoid. Forcing is for the Photoscan result and trail milestones,
     which someone deliberately asked for. A level-up is not that. */
  say(spoken || `${kicker}. ${headline}${sub ? `. ${sub}` : ""}`, force);

  if (sound) play(sound);

  const still = reducedMotion();
  const life = still ? Math.round(ms * 1.35) : ms;

  const panel = el("div", {
    class: `fx-moment fx-moment--${tone} ${still ? "is-still" : ""}`,
    role: "status",
  });

  /* Where focus was when the good news arrived. Restored only if the
     panel actually ended up holding focus — if the visitor never
     tabbed into it, moving focus on close would be the interruption
     we are trying not to cause. */
  const cameFrom = document.activeElement;

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    const hadFocus = panel.contains(document.activeElement);
    panel.remove();
    if (--open <= 0) {
      open = 0;
      document.removeEventListener("keydown", onKey, true);
    }
    if (hadFocus && cameFrom && cameFrom.isConnected && typeof cameFrom.focus === "function") {
      cameFrom.focus({ preventScroll: true });
    }
  };
  panel.__close = close;

  const dismiss = el("button", {
    class: "fx-moment__x",
    type: "button",
    /* Named for what it does to THIS panel, not "close" — a screen
       reader user tabbing past four of these needs to know which. */
    "aria-label": `Dismiss: ${headline}`,
    html: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
             stroke-width="2.2" stroke-linecap="round" aria-hidden="true" focusable="false">
             <path d="m6 6 12 12M18 6 6 18"/></svg>`,
    onclick: close,
  });

  panel.append(
    art ? el("span", { class: "fx-moment__art", "aria-hidden": "true" }, [art]) : null,
    el("span", { class: "fx-moment__body" }, [
      el("span", { class: "fx-moment__k", text: kicker }),
      el("span", { class: "fx-moment__h", text: headline }),
      sub ? el("span", { class: "fx-moment__s", text: sub }) : null,
    ]),
    dismiss
  );

  /* ⚠️ NOT animationend. base.css crushes every animation to 0.01ms
     under reduced motion, so an animationend-driven removal would
     fire instantly and the panel would blink out of existence for
     precisely the people who need longer to read it. A timer is the
     only thing that behaves the same in both worlds. */
  const timer = setTimeout(close, life);
  panel.style.setProperty("--life", `${life}ms`);

  stackEl().append(panel);
  if (open++ === 0) document.addEventListener("keydown", onKey, true);

  return close;
}

/* ---------------- the five occasions ---------------- */

/** You are on a hike. The single most important yes in the app. */
export function joinedHike(hike, { rejoined = false } = {}) {
  const name = String(hike.title || "this walk").split("—")[0].trim();
  return moment({
    tone: "join",
    sound: "join",
    kicker: rejoined ? "Back in" : "You're going",
    headline: name,
    sub: hike.location_name || hike.region || "",
    spoken: `${rejoined ? "Rejoined" : "Joined"} ${name}.`,
    art: ringArt("check"),
    ms: 2800,
  });
}

/** A level-up is rare enough to deserve a whole moment. */
export function levelUp(level, name) {
  return moment({
    tone: "level",
    sound: "levelup",
    kicker: `Level ${level}`,
    headline: name || `Level ${level}`,
    sub: "Your level shows on every hike you join",
    spoken: `Level up. Level ${level}${name ? `, ${name}` : ""}.`,
    art: el("span", { class: "fx-moment__lv", text: String(level) }),
    ms: 3600,
  });
}

/** Unlocking a badge — the collection payoff. */
export function badgeUnlocked(badge) {
  return moment({
    tone: "badge",
    sound: "badge",
    kicker: "Badge unlocked",
    headline: badge.name,
    sub: badge.hint || "",
    spoken: `Badge unlocked: ${badge.name}.`,
    art: el("span", { class: "fx-moment__ring", "data-tier": badge.tier || "bronze" }),
    ms: 3200,
  });
}

/** A recorded walk, saved. The end of the loop the app is built around. */
export function walkFinished({ distance, duration, place, force = false } = {}) {
  return moment({
    tone: "walk",
    sound: "milestone",
    kicker: "Walk saved",
    headline: [distance, duration].filter(Boolean).join(" · ") || "Recorded",
    sub: place || "It's on your shelf now",
    spoken: `Walk saved. ${[distance, duration].filter(Boolean).join(", ")}.`,
    art: ringArt("route"),
    ms: 3400,
    force,
  });
}

/** Streaks only get a moment at the numbers that mean something. */
export const STREAK_STEPS = [3, 7, 14, 30, 50, 100];

export function streakMilestone(days) {
  return moment({
    tone: "streak",
    sound: "milestone",
    kicker: "Streak",
    headline: `${days} days running`,
    sub: days >= 30 ? "That is a habit now, not a streak" : "Come back tomorrow to keep it",
    spoken: `${days} day streak.`,
    art: ringArt("flame"),
    ms: 3200,
  });
}

/* Small inline glyphs. Deliberately not importing icons.js in full —
   these three are the only ones this file needs and they are drawn at
   a fixed size inside a ring. */
function ringArt(kind) {
  const paths = {
    check: `<path d="m5 12.5 4.5 4.5L19 7"/>`,
    route: `<circle cx="6" cy="18" r="2.6"/><circle cx="18" cy="6" r="2.6"/><path d="M8.4 16.4C11 14 10 10 13 8.2"/>`,
    flame: `<path d="M12 3s4.6 3.9 4.6 8.1a4.6 4.6 0 0 1-9.2 0c0-1.6.8-3 .8-3S9 11.2 10.2 11.2c1.4 0 1.6-2.6 1.8-8.2Z"/>`,
  }[kind] || "";
  return el("span", {
    class: "fx-moment__glyph",
    html: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             aria-hidden="true" focusable="false">${paths}</svg>`,
  });
}

/* ---------------- remembering what was already celebrated ----------------
   Without this, every reload replays every unlock you have ever had. */
const SEEN = "biomate/celebrated";

function seen() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN) || "[]")); } catch { return new Set(); }
}
function remember(set) {
  localStorage.setItem(SEEN, JSON.stringify([...set]));
}

/** Fire once for anything newly earned since last time. Returns how many. */
export function celebrateNew(badges, level) {
  const s = seen();
  let fired = 0;

  const lvKey = `lv:${level}`;
  if (level > 1 && !s.has(lvKey)) { s.add(lvKey); fired++; }

  const fresh = badges.filter((b) => b.earned && !s.has(`b:${b.key}`));
  fresh.forEach((b) => s.add(`b:${b.key}`));

  /* first run of a seeded account would otherwise fire ten at once —
     record them silently and only celebrate from here on */
  const firstRun = !localStorage.getItem(SEEN);
  remember(s);
  if (firstRun) return 0;

  if (fired) {
    /* level first, then badges, spaced so they do not stack on screen */
    setTimeout(() => levelUp(level, ""), 200);
  }
  fresh.forEach((b, i) => setTimeout(() => badgeUnlocked(b), 600 + i * 900));
  return fired + fresh.length;
}

/**
 * Streaks, run through the same once-only ledger as badges.
 *
 * ⚠️ Called on every boot, so the guard is the whole feature: without
 * it, a 30-day streak would throw the same panel at you every single
 * morning until it broke. The ledger is keyed by the STEP reached,
 * not by the current count, so re-opening the app four times on day
 * seven celebrates once.
 *
 * @param {number} days
 * @returns {boolean} whether anything fired
 */
export function celebrateStreak(days) {
  const step = STREAK_STEPS.filter((n) => days >= n).pop();
  if (!step) return false;

  const s = seen();
  const key = `streak:${step}`;
  if (s.has(key)) return false;

  /* Same first-run rule as the badges: a returning visitor whose
     ledger has never been written must not be ambushed by a
     celebration for a streak they built before this feature existed. */
  const firstRun = !localStorage.getItem(SEEN);
  s.add(key);
  remember(s);
  if (firstRun) return false;

  /* after the boot sequence has settled, not on top of it */
  setTimeout(() => streakMilestone(step), 900);
  return true;
}
