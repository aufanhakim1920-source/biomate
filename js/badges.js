/* ============================================================
   Biomate — badges you can actually show off

   From the whiteboard: "badges/achievements", "contribute badges",
   and — the important one — **"choose badges to display"**. Earning
   them is half of it; picking which three represent you is the half
   that makes them worth having.

   Every badge is DERIVED from rows that already exist. Nothing is
   awarded by a client write, so nothing can be granted by editing a
   request. `profiles.badges` stores only which ones you have CHOSEN
   to display — that is a preference, not a score.

   Tiers exist so the shelf reads as a collection with a long tail
   rather than a checklist you finish in an afternoon.
   ============================================================ */

export const TIERS = {
  bronze: { label: "Bronze", hue: "#B87333" },
  silver: { label: "Silver", hue: "#9AA3AB" },
  gold:   { label: "Gold",   hue: "#D4A017" },
};

/**
 * @param {object} f facts gathered once by whoever calls this
 * @returns {Array<{key,name,hint,tier,earned,progress,goal}>}
 */
export function catalogue(f) {
  const {
    joined = 0, hosted = 0, logs = 0, metres = 0, messages = 0,
    scans = 0, states = 0, hardDone = 0, streak = 0, people = 0,
  } = f;

  const B = (key, name, hint, tier, progress, goal, icon) => ({
    key, name, hint, tier, icon,
    progress: Math.min(progress, goal),
    goal,
    earned: progress >= goal,
  });

  return [
    B("first_steps", "First Steps",  "Join your first hike",              "bronze", joined,   1,  "route"),
    B("hello",       "Ice Breaker",  "Say something in a group chat",     "bronze", messages, 1,  "chat"),
    B("company",     "Good Company", "Be on three hikes",                 "bronze", joined,   3,  "people"),
    B("logger",      "Trail Logger", "Record a walk from start to end",   "bronze", logs,     1,  "clock"),

    B("ten_k",       "Ten Kay",      "Walk 10 km in total",               "silver", Math.floor(metres / 1000), 10, "route"),
    B("host",        "Trail Boss",   "Host a hike of your own",           "silver", hosted,   1,  "map"),
    B("botanist",    "Botanist",     "Identify three plants or animals",  "silver", scans,    3,  "leaf"),
    B("social",      "Well Met",     "Walk with ten different people",    "silver", people,  10,  "people"),
    B("week",        "Seven Days",   "Keep a seven day streak",           "silver", streak,   7,  "flame"),

    B("cartographer","Cartographer", "Hike in three different states",    "gold",   states,   3,  "map"),
    B("summit",      "Summit Seeker","Finish a hard hike",                "gold",   hardDone, 1,  "alert"),
    B("marathon",    "Fifty Up",     "Walk 50 km in total",               "gold",   Math.floor(metres / 1000), 50, "route"),
    B("month",       "Thirty Days",  "Keep a thirty day streak",          "gold",   streak,  30,  "flame"),
    B("continental", "Continental",  "Hike in all seven states",          "gold",   states,   7,  "pin"),
  ];
}

export const MAX_SHOWCASE = 3;

/** The ones they chose to display, filtered to the ones they actually own. */
export function showcase(all, chosen = []) {
  const earned = new Set(all.filter((b) => b.earned).map((b) => b.key));
  const picked = (chosen || []).filter((k) => earned.has(k)).slice(0, MAX_SHOWCASE);
  if (picked.length) return all.filter((b) => picked.includes(b.key));
  /* nothing chosen yet: show the rarest they own, so a new profile is
     never blank and the tier system is visible from day one */
  const order = { gold: 0, silver: 1, bronze: 2 };
  return all.filter((b) => b.earned).sort((a, b) => order[a.tier] - order[b.tier]).slice(0, MAX_SHOWCASE);
}
