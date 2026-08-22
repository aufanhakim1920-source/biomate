/* ============================================================
   Biomate — levels and XP

   From the whiteboard: "gamified components — streak, levels to
   hikes, contribute badges". The brief keeps it explicitly
   SECONDARY to the social features, so it lives on the profile and
   as a small chip, never in the way of finding a hike.

   ⚠️ XP is DERIVED IN THE DATABASE, never stored as a number the
   client can write. `public.xp_for(uuid)` recomputes it from the
   rows that already exist, so it cannot drift out of sync with
   reality and cannot be cheated by PATCHing a column. The app only
   ever reads it, through the `player_stats` view.

   What earns it, and why each is weighted the way it is:
     joining a hike        25   showing up is the point of the app
     hosting one           60   somebody has to make the plan
     terrain difficulty  10/30/70  easy / moderate / hard
     a message             5   capped at 150 — chat is not a ladder
     distance walked       1 per 100m
   ============================================================ */

export const LEVELS = [
  { min: 0,    name: "Day Tripper",  blurb: "Just getting outside" },
  { min: 100,  name: "Weekender",    blurb: "A couple of walks in" },
  { min: 250,  name: "Trail Walker", blurb: "You know your way around a track" },
  { min: 500,  name: "Ridge Runner", blurb: "Long days don't scare you" },
  { min: 900,  name: "Peak Bagger",  blurb: "Summits are the point" },
  { min: 1500, name: "Thru-Hiker",   blurb: "Multi-day, full pack, any weather" },
  { min: 2500, name: "Trail Legend", blurb: "People plan around your invites" },
];

/** @returns {{level:number,name:string,blurb:string,xp:number,into:number,span:number,next:number|null,pct:number}} */
export function levelFor(xp = 0) {
  let i = 0;
  for (let n = 0; n < LEVELS.length; n++) if (xp >= LEVELS[n].min) i = n;
  const cur = LEVELS[i];
  const nxt = LEVELS[i + 1] || null;
  const into = xp - cur.min;
  const span = nxt ? nxt.min - cur.min : Math.max(1, into);
  return {
    level: i + 1,
    name: cur.name,
    blurb: cur.blurb,
    xp,
    into,
    span,
    next: nxt ? nxt.min : null,
    pct: nxt ? Math.min(100, Math.round((into / span) * 100)) : 100,
  };
}

/**
 * The same weights the SQL uses, recomputed client-side purely to SHOW
 * people where their points came from. Never used as the score itself —
 * the database's number is the truth.
 */
export function breakdown({ joined = 0, hosted = 0, terrain = 0, messages = 0, metres = 0 }) {
  return [
    { label: "Hikes joined",     xp: joined * 25,   detail: `${joined} × 25` },
    { label: "Hikes hosted",     xp: hosted * 60,   detail: `${hosted} × 60` },
    { label: "Terrain climbed",  xp: terrain,       detail: "harder ground, more points" },
    { label: "Said something",   xp: Math.min(messages * 5, 150), detail: messages ? `${messages} messages (capped at 150)` : "—" },
    { label: "Distance walked",  xp: Math.floor(metres / 100), detail: `${(metres / 1000).toFixed(1)} km` },
  ].filter((r) => r.xp > 0);
}

export const TERRAIN_XP = { easy: 10, moderate: 30, hard: 70 };
