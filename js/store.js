/* ============================================================
   Biomate — state store, ~40 lines, no library

   Why this exists: the swipe deck, the group chat and the
   availability grid are all genuinely stateful, and hand-rolled DOM
   code sprawls fastest exactly there. One object, one subscribe,
   one notify — enough structure to stop the sprawl, not enough to
   become a framework.
   ============================================================ */

const state = {
  route: "home",
  params: {},
  me: null,
  status: { driver: "local", signedIn: false, degraded: false },

  hikes: [],
  members: [],
  swipes: [],

  filters: [],          // active chip filters on the deck
  audio: false,         // audio description on/off
  theme: null,          // null = follow the system
};

const listeners = new Set();

export function get() { return state; }

/** Shallow-merge a patch and notify. Returns the new state. */
export function set(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => {
    try { fn(state); } catch (err) { console.error("[store] listener threw", err); }
  });
  return state;
}

/** Subscribe; returns an unsubscribe. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ---- small persisted preferences ----
   Kept out of the database on purpose: they are device settings, not
   account data, and they must work before anyone is signed in. */
const PREF = "biomate/prefs";

export function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF) || "{}");
    Object.assign(state, {
      audio: Boolean(p.audio),
      theme: p.theme || null,
      filters: Array.isArray(p.filters) ? p.filters : [],
    });
  } catch { /* defaults already in state */ }
  return state;
}

export function savePrefs() {
  localStorage.setItem(PREF, JSON.stringify({
    audio: state.audio,
    theme: state.theme,
    filters: state.filters,
  }));
}
