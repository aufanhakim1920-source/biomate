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
}

/**
 * Announce something.
 * @param {string} text
 * @param {boolean} [force] speak even if audio description is off
 *        (used for the Photoscan result, which is the whole point of
 *        the feature for a low-vision user)
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
