/* ============================================================
   Biomate — daily missions

   Aufan: "there is mission and collection". Three a day, and the
   three are SEEDED FROM THE DATE — so everyone gets the same set
   today, it changes at midnight, and it needs no table, no cron and
   no write. Same trick as Peak & Pan's daily quests.

   Progress is measured against real rows, so a mission cannot be
   completed by clicking anything except by doing the thing.
   ============================================================ */

const POOL = [
  { key: "swipe3",  name: "Look at three hikes",      goal: 3, xp: 15, of: (f) => f.swipesToday,   icon: "cards" },
  { key: "join1",   name: "Join a hike",              goal: 1, xp: 40, of: (f) => f.joinedToday,   icon: "check" },
  { key: "say1",    name: "Say something to a group", goal: 1, xp: 20, of: (f) => f.messagesToday, icon: "chat" },
  { key: "plan1",   name: "Add a stop to a plan",     goal: 1, xp: 25, of: (f) => f.stopsToday,    icon: "pin" },
  { key: "scan1",   name: "Identify something",       goal: 1, xp: 30, of: (f) => f.scansToday,    icon: "leaf" },
  { key: "when1",   name: "Fill in your availability",goal: 1, xp: 25, of: (f) => f.availToday,    icon: "calendar" },
  { key: "walk2",   name: "Walk two kilometres",      goal: 2, xp: 35, of: (f) => Math.floor(f.metresToday / 1000), icon: "route" },
  { key: "meet1",   name: "End up on a hike with someone new", goal: 1, xp: 45, of: (f) => f.newPeopleToday, icon: "people" },
];

/* a small deterministic hash so "today" always picks the same three */
function pick(dateStr, n) {
  let h = 2166136261;
  for (let i = 0; i < dateStr.length; i++) { h ^= dateStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  const idx = [];
  const used = new Set();
  let x = h >>> 0;
  while (idx.length < n) {
    x = (x * 1664525 + 1013904223) >>> 0;
    const i = x % POOL.length;
    if (!used.has(i)) { used.add(i); idx.push(i); }
  }
  return idx.map((i) => POOL[i]);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

/** @returns {Array<{key,name,goal,xp,done,progress,icon}>} */
export function missionsFor(facts, dateStr = today()) {
  return pick(dateStr, 3).map((m) => {
    const progress = Math.max(0, Math.min(m.goal, m.of(facts) || 0));
    return { ...m, progress, done: progress >= m.goal };
  });
}
