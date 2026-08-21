/* ============================================================
   Biomate — celebration effects

   One-shot only. Nothing loops, nothing drifts, and everything here
   checks prefers-reduced-motion first — ambient motion is the one
   thing Aufan has consistently said makes him nauseous, and a
   reward animation that keeps playing stops being a reward.

   ⚠️ Every transient node gets a setTimeout fallback next to its
   animationend listener. If an element never animates — reduced
   motion, a hidden tab, display:none — animationend never fires and
   the node lives forever. That leak was measured on Peak & Pan:
   28 pieces still in the DOM 2.4s after the effect "finished".
   ============================================================ */

import { el } from "./ui.js";
import { say, reducedMotion } from "./a11y.js";

function transient(node, ms) {
  document.body.append(node);
  const kill = () => node.remove();
  node.addEventListener("animationend", kill, { once: true });
  setTimeout(kill, ms);            // the fallback that stops the leak
}

/**
 * "+25 XP" flying from wherever it was earned up to the level chip.
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

/** A level-up is rare enough to deserve a whole moment. */
export function levelUp(level, name) {
  say(`Level up. Level ${level}, ${name}.`, true);
  if (reducedMotion()) return;
  transient(
    el("div", { class: "fx-level", role: "status" }, [
      el("span", { class: "fx-level__lv", text: `LEVEL ${level}` }),
      el("span", { class: "fx-level__name", text: name }),
    ]),
    2600
  );
}

/** Unlocking a badge — the collection payoff. */
export function badgeUnlocked(badge) {
  say(`Badge unlocked: ${badge.name}.`, true);
  if (reducedMotion()) return;
  transient(
    el("div", { class: "fx-badge", role: "status" }, [
      el("span", { class: "fx-badge__ring", "data-tier": badge.tier }),
      el("span", {}, [
        el("span", { class: "fx-badge__t", text: "Badge unlocked" }),
        el("span", { class: "fx-badge__n", text: badge.name }),
      ]),
    ]),
    3000
  );
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
