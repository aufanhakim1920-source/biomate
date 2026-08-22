/* ============================================================
   Biomate — why this hike, and why now

   ⚠️ This exists partly because the PRD was claiming something that
   was not true. It described the matching as a "weighted
   preference-overlap score"; the deck was a tag filter in whatever
   order the database returned. A document that leads with honesty
   cannot carry a line like that, so either the claim goes or the code
   arrives. Aufan asked for recommendations, so the code arrived.

   Two rules shape it:

   1. EVERY POINT IS EXPLAINABLE. The score is never shown as a
      number — a "94% match" is a black box, and this project derives
      rather than stores precisely so that nothing has to be taken on
      faith. What surfaces is the REASON: "Sam is going", "photography",
      "near Melbourne". If a signal cannot be phrased as a sentence a
      person would accept, it does not belong in the score.

   2. IT IS NOT MACHINE LEARNING AND WE DO NOT CALL IT THAT. It is
      arithmetic over rows you can go and read. Same standard as the XP
      and the badges.

   The weights are ordered by what the brief actually says the product
   is for: the hike is the occasion, the company is the point. So who
   is going outranks what the walk is.
   ============================================================ */

/* Deliberately not a config object. These numbers only mean anything
   relative to each other, and a table you can read top to bottom is
   easier to argue with than six named constants. */
const W = {
  friend: 60,      // someone you have already walked with is going
  interest: 22,    // per matching interest tag
  area: 30,        // it is near where you said you are
  fits: 18,        // the difficulty suits the experience you claimed
  mismatch: -25,   // ...or it clearly does not
  soon: 12,        // it has a date, and the date is close
  hasDate: 5,      // it has a date at all
  crowd: 4,        // per person already going, capped — busy reads as alive
};

const CROWD_CAP = 16;

/** Difficulty a given experience level is actually looking for. */
const FIT = {
  beginner:     { easy: W.fits, moderate: 0,      hard: W.mismatch },
  intermediate: { easy: 0,      moderate: W.fits, hard: 0 },
  "thru-hiker": { easy: W.mismatch, moderate: 0,  hard: W.fits },
};

/**
 * @param {object} hike
 * @param {object} ctx
 *   me         your profile row
 *   friends    Set of user ids you have hiked with
 *   goingBy    { [hikeId]: string[] } member ids per hike
 * @returns {{score:number, reasons:string[]}}
 */
export function scoreHike(hike, ctx = {}) {
  const { me = {}, friends = new Set(), goingBy = {} } = ctx;
  const reasons = [];
  let score = 0;

  /* ---- who is going. The brief's whole thesis. ---- */
  const going = goingBy[hike.id] || [];
  const known = going.filter((u) => friends.has(u) && u !== me.id);
  if (known.length) {
    score += W.friend;
    reasons.push(known.length === 1 ? "someone you've walked with is going" : `${known.length} people you've walked with are going`);
  }
  const others = going.filter((u) => u !== me.id).length;
  if (others) score += Math.min(others * W.crowd, CROWD_CAP);

  /* ---- what you said you were into ---- */
  const mine = ((me.prefs && me.prefs.interests) || []).map((t) => t.toLowerCase());
  const tags = (hike.tags || []).map((t) => t.toLowerCase());
  const shared = tags.filter((t) => mine.includes(t));
  if (shared.length) {
    score += shared.length * W.interest;
    reasons.push(shared.slice(0, 2).join(" and "));
  }

  /* ---- near you. This is the signal that makes the home screen's
     "new hikes happening near Melbourne" an honest sentence rather
     than decoration — it had no location filter behind it at all. ---- */
  const area = (me.home_area || "").trim().toLowerCase();
  if (area) {
    const where = `${hike.location_name || ""} ${hike.region || ""}`.toLowerCase();
    if (where.includes(area) || area.includes((hike.location_name || "").toLowerCase().trim())) {
      score += W.area;
      reasons.push(`near ${me.home_area}`);
    }
  }

  /* ---- does it suit you ---- */
  const fit = (FIT[me.experience] || {})[hike.difficulty];
  if (fit === W.fits) reasons.push("about your pace");
  if (typeof fit === "number") score += fit;

  /* ---- is it actually happening ---- */
  if (hike.proposed_date || hike.confirmed_date) {
    score += W.hasDate;
    const days = daysUntil(hike.confirmed_date || hike.proposed_date);
    if (days !== null && days >= 0 && days <= 14) {
      score += W.soon;
      if (days <= 7) reasons.push(days <= 1 ? "happening now" : "this week");
    }
  }

  return { score, reasons };
}

function daysUntil(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / 86400000);
}

/**
 * Sort a deck best-first, and hand back the reasons so the card can
 * say why it is there.
 *
 * ⚠️ Stable on ties: two hikes with the same score keep the order they
 * arrived in. Without that the deck reshuffles on every render and a
 * card you were half-way through swiping jumps.
 */
export function rank(hikes, ctx) {
  return hikes
    .map((h, i) => ({ hike: h, i, ...scoreHike(h, ctx) }))
    .sort((a, b) => (b.score - a.score) || (a.i - b.i))
    .map(({ hike, score, reasons }) => ({ hike, score, reasons }));
}

/**
 * Free-text search across the things a person would actually type:
 * where it is, what it is called, and what it is about.
 * Every term must match something — "photo melbourne" should not
 * return everything photographic OR everything in Melbourne.
 */
export function searchHikes(hikes, query) {
  const terms = String(query || "").toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return hikes;
  return hikes.filter((h) => {
    const hay = `${h.title || ""} ${h.location_name || ""} ${h.region || ""} ${h.description || ""} ${(h.tags || []).join(" ")} ${h.difficulty || ""}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}
