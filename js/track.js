/* ============================================================
   Biomate — the trail recording engine

   Aufan asked the right question:

     "these line cant be like overlap it will crash if too much"

   He is correct, and the first version of this screen had exactly
   that bug. Worth writing down what actually goes wrong, because
   none of it is obvious until a walk is four hours long:

   1. `watchPosition` with enableHighAccuracy fires about once a
      second. A four-hour walk is ~14,000 fixes. The old code redrew
      the WHOLE canvas on every fix, so the work is O(n²) — about a
      hundred million point operations by the end. Not a crash, but a
      phone that stutters and cooks its battery, which is worse
      because it looks like the app is fine.

   2. `Math.min(...array)` genuinely throws "Maximum call stack size
      exceeded" somewhere north of 100k arguments. So the naive
      bounds calculation is a real crash, not a slow one. Nothing in
      here uses spread on a track array. Not once.

   3. The visual complaint he described — the line overlapping
      itself — is not a drawing bug, it is honest GPS. Standing at a
      lookout for three minutes gives you 180 fixes scattered in an
      8-metre circle, and drawn raw that is a scribble sitting on
      your route like a hairball.

   So this module is three gates and a simplifier:

     · ACCURACY GATE  — throw away fixes the device admits are vague
     · SPEED GATE     — throw away teleports (a "walk" at 40km/h)
     · MOVEMENT GATE  — ignore fixes under ~8m from the last one,
                        which is what kills the standing-still hairball
     · DOUGLAS-PEUCKER — collapse the kept points down to the ones
                        that actually describe the shape

   ⚠️ Distance is accumulated from ACCEPTED FIXES, before
   simplification. This matters: if distance were measured from the
   simplified line, tidying up your track would quietly shorten your
   walk. Simplification is allowed to change how the route is drawn.
   It is never allowed to change what you did.
   ============================================================ */

const R = 6371008.8;
const toRad = (d) => (d * Math.PI) / 180;

/* haversine, metres */
export function metres(a, b) {
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/* A track is a flat array of [lat, lng] with `null` meaning "the pen
   lifted here" — signal lost, or the app was in the background. A gap
   is drawn as a break rather than a straight line across the missing
   part, because a straight line across a gap is a lie about where you
   walked. */
export function segments(pts) {
  const segs = [];
  let cur = [];
  for (let i = 0; i < pts.length; i++) {
    if (pts[i] === null) {
      if (cur.length) segs.push(cur);
      cur = [];
    } else cur.push(pts[i]);
  }
  if (cur.length) segs.push(cur);
  return segs;
}

/* ---- Douglas-Peucker, iteratively ----
   Recursive is the textbook form and it blows the stack on exactly
   the long tracks this exists to handle. An explicit stack costs two
   extra lines and cannot overflow. */
export function simplify(pts, tolerance = 6) {
  if (pts.length < 3) return pts.slice();

  /* project to local metres — over a walk-sized area the error from
     treating this as flat is centimetres, and it turns an expensive
     haversine per candidate point into two multiplications */
  const kx = 111320 * Math.cos(toRad(pts[0][0]));
  const ky = 110540;
  const n = pts.length;
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) { x[i] = pts[i][1] * kx; y[i] = pts[i][0] * ky; }

  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;

  const tol2 = tolerance * tolerance;
  const stack = [0, n - 1];

  while (stack.length) {
    const j = stack.pop();
    const i = stack.pop();
    if (j - i < 2) continue;

    const ax = x[i], ay = y[i];
    const dx = x[j] - ax, dy = y[j] - ay;
    const len2 = dx * dx + dy * dy;

    let best = -1, bestD = -1;
    for (let k = i + 1; k < j; k++) {
      const px = x[k] - ax, py = y[k] - ay;
      let t = len2 ? (px * dx + py * dy) / len2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = px - t * dx, ey = py - t * dy;
      const d = ex * ex + ey * ey;
      if (d > bestD) { bestD = d; best = k; }
    }

    if (bestD > tol2) {
      keep[best] = 1;
      stack.push(i, best, best, j);
    }
  }

  const out = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[i]);
  return out;
}

/* simplify each segment independently — a gap is a hard boundary and
   must never be smoothed over */
export function simplifyTrack(pts, tolerance = 6) {
  const segs = segments(pts);
  const out = [];
  for (let s = 0; s < segs.length; s++) {
    if (s) out.push(null);
    const thin = simplify(segs[s], tolerance);
    /* deliberately a loop, not out.push(...thin) — spread on a long
       array is the crash described at the top of this file */
    for (let i = 0; i < thin.length; i++) out.push(thin[i]);
  }
  return out;
}

export function countPoints(pts) {
  let n = 0;
  for (let i = 0; i < pts.length; i++) if (pts[i] !== null) n++;
  return n;
}

/* ============================================================
   The recorder
   ============================================================ */

export const DEFAULTS = {
  maxAccuracy: 25,   /* metres — the device's own confidence         */
  minMove: 8,        /* metres — below this you are standing still   */
  maxSpeed: 6,       /* m/s, about 21 km/h — faster than any walk    */
  gapMs: 20000,      /* silence longer than this breaks the line     */
  softCap: 2000,     /* points held live before re-simplifying       */
  minAscent: 3,      /* metres — altitude noise floor                */
};

export function createRecorder(opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };

  /* Elapsed time is read from the recording's OWN clock, not from
     Date.now() directly. For a real walk they are the same thing. For
     the replayed demo track they are not: a demo squeezes hours of
     walking into a minute of wall time, and if the clock stayed real
     then every synthetic fix would look like a 200 m/s teleport and
     the speed gate would — correctly — throw the whole walk away.
     Handing the demo its own clock keeps the gates honest instead of
     adding a "trust me, this one is fine" exception to them. */
  let clock = () => Date.now();

  const s = {
    pts: [],
    distance: 0,
    ascent: 0,
    startedAt: 0,
    lastAt: 0,
    last: null,
    lastAlt: null,
    accuracy: null,
    accepted: 0,
    rejected: 0,
    gaps: 0,
    tolerance: 6,
    hasAltitude: false,
  };

  function start(at = clock()) {
    s.startedAt = at;
    s.lastAt = at;
  }

  /* Most phones report altitude from GPS alone, which is far less
     accurate than the horizontal fix and drifts by tens of metres
     while standing still. Only count a climb that clears the noise
     floor, and record whether usable altitude ever arrived so the UI
     can say "not measured" instead of showing a confident zero. */
  function trackAltitude(alt, altAcc) {
    if (alt == null || !Number.isFinite(alt)) return;
    if (altAcc != null && altAcc > 15) return;
    s.hasAltitude = true;
    if (s.lastAlt == null) { s.lastAlt = alt; return; }
    const dz = alt - s.lastAlt;
    if (Math.abs(dz) < cfg.minAscent) return;
    if (dz > 0) s.ascent += dz;
    s.lastAlt = alt;
  }

  /* Keep the live array bounded no matter how long the walk runs.
     Each pass raises the tolerance a little, so a very long track
     settles instead of thrashing between simplify and refill. */
  function maybeSimplify() {
    if (s.pts.length <= cfg.softCap) return;
    s.pts = simplifyTrack(s.pts, s.tolerance);
    if (s.pts.length > cfg.softCap * 0.9) s.tolerance *= 1.6;
  }

  /* returns { added, reason } — the reason is shown on screen, because
     "nothing is happening" with no explanation reads as broken */
  function accept(fix) {
    const { lat, lng, accuracy = null, altitude = null, altitudeAccuracy = null } = fix;
    const at = fix.at || clock();

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      s.rejected++;
      return { added: false, reason: "bad fix" };
    }

    s.accuracy = accuracy;

    if (accuracy != null && accuracy > cfg.maxAccuracy) {
      s.rejected++;
      return { added: false, reason: "weak signal" };
    }

    const p = [lat, lng];

    if (!s.last) {
      s.pts.push(p);
      s.last = p;
      s.lastAt = at;
      s.accepted++;
      trackAltitude(altitude, altitudeAccuracy);
      return { added: true, reason: "" };
    }

    const dt = at - s.lastAt;
    const d = metres(s.last, p);

    /* a long silence means the app was backgrounded or the signal
       died. Break the line rather than drawing across it, and do not
       claim the distance either. */
    if (dt > cfg.gapMs) {
      s.pts.push(null, p);
      s.gaps++;
      s.last = p;
      s.lastAt = at;
      s.accepted++;
      s.lastAlt = null;
      trackAltitude(altitude, altitudeAccuracy);
      maybeSimplify();
      return { added: true, reason: "signal returned" };
    }

    if (dt > 0 && d / (dt / 1000) > cfg.maxSpeed) {
      s.rejected++;
      return { added: false, reason: "jump ignored" };
    }

    if (d < cfg.minMove) {
      /* not a rejection worth counting — this is the normal state
         while you stand and look at something */
      return { added: false, reason: "holding still" };
    }

    s.distance += d;
    s.pts.push(p);
    s.last = p;
    s.lastAt = at;
    s.accepted++;
    trackAltitude(altitude, altitudeAccuracy);
    maybeSimplify();
    return { added: true, reason: "" };
  }

  const round5 = (v) => Math.round(v * 1e5) / 1e5;   /* ~1.1 m — plenty */

  /* the shape that goes to the database */
  function toRow() {
    const tidy = simplifyTrack(s.pts, Math.max(s.tolerance, 6));
    const route = tidy.map((p) => (p === null ? null : [round5(p[0]), round5(p[1])]));
    return {
      distance_m: Math.round(s.distance),
      duration_s: Math.max(0, Math.round((clock() - s.startedAt) / 1000)),
      ascent_m: s.hasAltitude ? Math.round(s.ascent) : 0,
      route,
    };
  }

  return {
    cfg,
    start,
    accept,
    toRow,
    now: () => clock(),
    setClock(fn) { clock = fn; },
    get pts() { return s.pts; },
    get distance() { return s.distance; },
    get ascent() { return s.ascent; },
    get accuracy() { return s.accuracy; },
    get accepted() { return s.accepted; },
    get rejected() { return s.rejected; },
    get gaps() { return s.gaps; },
    get startedAt() { return s.startedAt; },
    get hasAltitude() { return s.hasAltitude; },

    markGap() {
      if (s.pts.length && s.pts[s.pts.length - 1] !== null) {
        s.pts.push(null);
        s.gaps++;
        s.last = null;
        s.lastAlt = null;
      }
    },

    snapshot() {
      return {
        v: 1,
        pts: s.pts,
        distance: s.distance,
        ascent: s.ascent,
        startedAt: s.startedAt,
        lastAt: s.lastAt,
        hasAltitude: s.hasAltitude,
        tolerance: s.tolerance,
      };
    },

    restore(snap) {
      if (!snap || snap.v !== 1 || !Array.isArray(snap.pts)) return false;
      s.pts = snap.pts;
      s.distance = snap.distance || 0;
      s.ascent = snap.ascent || 0;
      s.startedAt = snap.startedAt || clock();
      s.lastAt = snap.lastAt || s.startedAt;
      s.hasAltitude = !!snap.hasAltitude;
      s.tolerance = snap.tolerance || 6;
      for (let i = s.pts.length - 1; i >= 0; i--) {
        if (s.pts[i] !== null) { s.last = s.pts[i]; break; }
      }
      return true;
    },
  };
}
