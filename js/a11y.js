/* ============================================================
   Biomate — accessibility layer

   Two channels for the same sentence, on purpose:

   1. An `aria-live` region. Real assistive tech reads this. It is
      always on, because it costs a screen-reader user nothing and
      it is the only channel that actually works for them.
   2. `speechSynthesis`. Off by default — a shared demo link must
      never start talking at someone — and toggled by the user.

   Doing only #2 is the common mistake: TTS and a screen reader
   talking over each other is worse than either alone. Doing #1 as
   well means the toggle is a convenience, not a lifeline.

   Full spec: docs/ACCESSIBILITY.md
   ============================================================ */

import { get, set, savePrefs } from "./store.js";

let liveRegion = null;
let lastSpoken = "";

export function mount() {
  liveRegion = document.getElementById("live");
  if (!liveRegion) {
    liveRegion = document.createElement("div");
    liveRegion.id = "live";
    liveRegion.className = "sr-only";
    liveRegion.setAttribute("role", "status");
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    document.body.appendChild(liveRegion);
  }
  applyTheme();
  mountSkipLink();
}

/* ⚠️ The skip link was navigating instead of skipping.

   `<a href="#screen">` looks like the textbook skip link, and in an
   ordinary page it is. This app uses a HASH ROUTER, and the router
   parses `location.hash` as a route name — with the leading slash
   optional. So "#screen" resolved to a route called "screen", found
   nothing, and fell back to Home.

   Net effect: the first control a keyboard user reaches on every
   screen threw them back to Home. In an app whose accessibility is
   supposed to be design rather than compliance, the one control that
   exists purely for keyboard users was the one that did not work.

   So it moves focus itself and never touches the hash. `tabindex="-1"`
   is set at click time rather than in the markup because the router
   already sets and relies on it, and two places quietly fighting over
   the same attribute is how this stops working again later. */
function mountSkipLink() {
  const link = document.querySelector(".skip-link");
  const screen = document.getElementById("screen");
  if (!link || !screen) return;

  link.addEventListener("click", (e) => {
    e.preventDefault();
    screen.setAttribute("tabindex", "-1");
    screen.focus();
    /* scroll after focusing: focus() on a -1 element does not always
       bring it into view, and the appbar is sticky over the top of it */
    screen.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" });
    say("Skipped to the main content.");
  });
}

/**
 * Announce something.
 * @param {string} text
 * @param {boolean} [force] speak even if audio description is off.
 *        For the few things worth interrupting for: a kilometre
 *        milestone while the phone is in a pocket, a save confirming,
 *        an account action landing. Not for ordinary screen changes.
 */
export function say(text, force = false) {
  if (!text || text === lastSpoken) return;
  lastSpoken = text;

  /* the live region always gets it — this is the channel that works
     for a real screen reader */
  if (liveRegion) {
    liveRegion.textContent = "";
    /* a same-value write is not announced; clearing first forces it */
    setTimeout(() => { liveRegion.textContent = text; }, 30);
  }

  if (!(get().audio || force)) return;
  if (!("speechSynthesis" in window)) return;

  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02;
    u.lang = document.documentElement.lang || "en-AU";
    speechSynthesis.speak(u);
  } catch (err) {
    console.warn("[a11y] speech unavailable", err);
  }
}

export function setAudio(on) {
  set({ audio: Boolean(on) });
  savePrefs();
  if (!on && "speechSynthesis" in window) speechSynthesis.cancel();
  say(on ? "Audio description on." : "Audio description off.", Boolean(on));
}

/* ---------------- theme ---------------- */
export function applyTheme() {
  const t = get().theme;
  if (t) document.documentElement.setAttribute("data-theme", t);
  else document.documentElement.removeAttribute("data-theme");
}

export function setTheme(t) {
  set({ theme: t });
  savePrefs();
  applyTheme();
  say(t === "dark" ? "Dark theme." : t === "light" ? "Light theme." : "Following system theme.");
}

/* ---------------- helpers ---------------- */

/** True when the visitor has asked for less motion. */
export function reducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Make a non-button element behave like one for keyboard users.
 * Needed because a card whose content carries links cannot BE a
 * <button> — an <a> inside a <button> is invalid HTML and unclickable
 * in some browsers.
 */
export function actLikeButton(el, onActivate) {
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", "0");
  el.addEventListener("click", onActivate);
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate(e);
    }
  });
}
