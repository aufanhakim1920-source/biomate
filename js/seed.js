/* ============================================================
   Biomate — demo content for the local driver

   The app has to be worth looking at before anyone signs in, so the
   local database starts populated. Real Australian walks, written in
   the same casual register as the Figma's copy ("Looking for
   friends!", "pls come everyone pls").

   The live driver never touches this — it only seeds localStorage.
   ============================================================ */

import { landscape, face } from "./art.js";

const PEOPLE = [
  { id: "u-jeffrey", display_name: "jeffrey.jiang", pronouns: "he/him",   experience: "intermediate" },
  { id: "u-aaron",   display_name: "aaron.abbott",  pronouns: "he/him",   experience: "thru-hiker" },
  { id: "u-tanish",  display_name: "tanish.rathor", pronouns: "he/him",   experience: "intermediate" },
  { id: "u-elyse",   display_name: "elyse.w",       pronouns: "she/her",  experience: "beginner" },
  { id: "u-pavan",   display_name: "Pavan",         pronouns: "he/him",   experience: "thru-hiker" },
  { id: "u-mei",     display_name: "mei.lin",       pronouns: "she/her",  experience: "intermediate" },
  { id: "u-sam",     display_name: "sam.ok",        pronouns: "they/them", experience: "beginner" },
];

const HIKES = [
  {
    id: "h-uluru",
    host_id: "u-tanish",
    title: "Uluru and Kata Tjuta — Looking for friends!",
    region: "NT",
    location_name: "Uluru-Kata Tjuta National Park",
    difficulty: "moderate",
    tags: ["Day hikes", "Photography", "Camping"],
    proposed_date: "2026-09-14",
    description:
      "Hey everyone,\nPlease come with me to this I am so lonely and I need friends :( pls come everyone pls\nWe'll do the base walk at sunrise then Valley of the Winds after lunch.",
    capacity: 8,
  },
  {
    id: "h-grampians",
    host_id: "u-aaron",
    title: "Grampians Peaks — two nights, proper packs",
    region: "VIC",
    location_name: "Grampians / Gariwerd",
    difficulty: "hard",
    tags: ["Backpacking", "Camping", "Trail running"],
    proposed_date: "2026-09-20",
    description:
      "Section of the Peaks Trail, Halls Gap to Bugiga. Carrying everything. Not a beginner walk but I'll happily go slow for anyone who's keen and honest about it.",
    capacity: 6,
  },
  {
    id: "h-dandenong",
    host_id: "u-elyse",
    title: "1000 Steps then coffee — dogs very welcome",
    region: "VIC",
    location_name: "Dandenong Ranges",
    difficulty: "easy",
    tags: ["Day hikes", "Dog friendly"],
    proposed_date: "2026-08-30",
    description:
      "Nice and short. My whippet Biscuit is coming and he is extremely friendly and extremely stupid. Coffee at the bottom is mandatory.",
    capacity: 10,
  },
  {
    id: "h-wilsons",
    host_id: "u-mei",
    title: "Wilsons Prom sunrise — Squeaky Beach loop",
    region: "VIC",
    location_name: "Wilsons Promontory",
    difficulty: "moderate",
    tags: ["Day hikes", "Photography"],
    proposed_date: "2026-09-06",
    description:
      "Leaving Melbourne at 4am which is insane but the light is worth it. Bringing a proper camera, happy to take photos of people.",
    capacity: 5,
  },
  {
    id: "h-blue",
    host_id: "u-jeffrey",
    title: "Blue Mountains — Grand Canyon track",
    region: "NSW",
    location_name: "Blackheath",
    difficulty: "moderate",
    tags: ["Day hikes", "Photography", "Trail running"],
    proposed_date: "2026-09-27",
    description:
      "Done this one four times, never gets old. Ferns, waterfalls, a lot of stairs at the end that everybody complains about including me.",
    capacity: 8,
  },
  {
    id: "h-cradle",
    host_id: "u-pavan",
    title: "Cradle Mountain day trip — Dove Lake circuit",
    region: "TAS",
    location_name: "Cradle Mountain",
    difficulty: "easy",
    tags: ["Day hikes", "Photography", "Dog friendly"],
    proposed_date: "2026-10-04",
    description:
      "Unemployed, broke, needs money. Dream to fly to a new island with a private jet. Even better, fly the man himself. Anyway — flat walk, big views, come along.",
    capacity: 12,
  },
];

export function seedLocal(myId) {
  const now = Date.now();
  const iso = (offsetMin) => new Date(now - offsetMin * 60000).toISOString();

  const profiles = [
    { id: myId, display_name: "You", pronouns: "", bio: "", experience: "beginner", home_area: "Melbourne", prefs: {}, badges: [] },
    ...PEOPLE.map((p) => ({ ...p, bio: "", home_area: "", prefs: {}, badges: [], avatar_url: face(p.id) })),
  ];

  const hikes = HIKES.map((h) => ({
    ...h,
    photo_url: landscape(h.id),
    confirmed_date: null,
    status: "open",
    created_at: iso(600),
  }));

  /* You are already in the Uluru hike — so the app has a populated
     chat and plan to show without anyone having to swipe first. */
  const hike_members = [
    { hike_id: "h-uluru", user_id: myId, status: "joined", joined_at: iso(300) },
    ...["u-jeffrey", "u-aaron", "u-elyse", "u-mei"].map((u) => ({
      hike_id: "h-uluru", user_id: u, status: "joined", joined_at: iso(400),
    })),
    ...HIKES.map((h) => ({ hike_id: h.id, user_id: h.host_id, status: "joined", joined_at: iso(700) })),
  ];

  const messages = [
    { id: "m1", hike_id: "h-uluru", user_id: "u-tanish", kind: "system", body: "tanish.rathor created this hike", created_at: iso(300) },
    { id: "m2", hike_id: "h-uluru", user_id: "u-jeffrey", kind: "text", body: "we just saw a snake here so just be careful when you're walking by and stuff", created_at: iso(120) },
    { id: "m3", hike_id: "h-uluru", user_id: "u-aaron", kind: "text", body: "i'll be there sooon!!!", created_at: iso(90) },
    { id: "m4", hike_id: "h-uluru", user_id: "u-elyse", kind: "text", body: "I'm so excited! I'll see you on Monday then", created_at: iso(45) },
  ];

  const plans = [{
    hike_id: "h-uluru",
    agenda: "Sunrise at the base walk, breakfast at the car park, Valley of the Winds after lunch when it cools off.",
    stop_points: ["Mutitjulu Waterhole", "Kuniya Piti lookout", "Karu lookout"],
    meeting_point: "Kuniya car park, 5:15am",
    gear: ["3L water minimum", "Fly net (seriously)", "Sun hat", "Head torch for the early start"],
    updated_at: iso(200),
    updated_by: "u-tanish",
  }];

  /* Real-shaped routes, not empty arrays. A logged walk whose route is
     [] renders as a blank map, which makes the recorder look broken on
     first load — and the route thumbnail on the shelf is the thing
     that makes two 4 km walks look like different days.

     The Blue Mountains track deliberately contains a `null`: that is a
     break in the recording, and it is there so the "the line breaks
     where the signal died" behaviour is visible in the demo instead of
     only appearing the first time someone loses signal in a gully. */
  const trail_logs = [
    { id: "t1", hike_id: "h-dandenong", user_id: myId, distance_m: 4200, duration_s: 4980, ascent_m: 230,
      route: loopTrack(-37.8880, 145.3450, 150, 0.0065, 7), created_at: iso(60 * 24 * 9) },
    { id: "t2", hike_id: "h-blue", user_id: myId, distance_m: 11800, duration_s: 15600, ascent_m: 640,
      route: withGap(loopTrack(-33.7300, 150.3100, 240, 0.0140, 23), 96, 112), created_at: iso(60 * 24 * 30) },
  ];

  /* the two walks above are what makes "unique people you've hiked
     with" non-zero on first load */
  trail_logs.forEach((t) => {
    hike_members.push({ hike_id: t.hike_id, user_id: myId, status: "joined", joined_at: t.created_at });
  });
  hike_members.push(
    { hike_id: "h-dandenong", user_id: "u-sam", status: "joined", joined_at: iso(60 * 24 * 9) },
    { hike_id: "h-blue", user_id: "u-mei", status: "joined", joined_at: iso(60 * 24 * 30) },
    { hike_id: "h-blue", user_id: "u-sam", status: "joined", joined_at: iso(60 * 24 * 30) },
  );

  return {
    profiles,
    hikes,
    hike_members,
    messages,
    plans,
    trail_logs,
    swipes: [],
    availability: [],
    scans: [],
  };
}

/* ---- demo route shapes ----------------------------------------
   A deterministic wobbly loop. Deterministic matters: the seed data
   is rebuilt on every cold start, and a route that changed shape each
   time would make "is the drawing correct?" impossible to answer by
   looking. */
function loopTrack(lat0, lng0, n, spread, seed) {
  let s = seed * 7919 + 1;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const round5 = (v) => Math.round(v * 1e5) / 1e5;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const r = spread * (0.62 + 0.38 * Math.sin(t * 3 + seed));
    pts.push([
      round5(lat0 + Math.sin(t) * r + (rnd() - 0.5) * spread * 0.05),
      round5(lng0 + Math.cos(t) * r * 1.25 + (rnd() - 0.5) * spread * 0.05),
    ]);
  }
  return pts;
}

/* drop the points between `from` and `to` and leave a pen-lift behind,
   the way a real recording looks after the signal comes back */
function withGap(pts, from, to) {
  return [...pts.slice(0, from), null, ...pts.slice(to)];
}
