/* ============================================================
   Biomate — the trail engine, under load

   Run it:   node test/track.test.mjs

   This exists because Aufan asked whether a live GPS recording would
   fall over once the track got long — "these line cant be like
   overlap it will crash if too much" — and that deserved a measured
   answer rather than a confident one.

   Check 1 confirms his instinct literally: Math.min(...array) on a
   200,000-point track throws a RangeError. It is a real crash, not a
   slow path, and it is what the naive bounds calculation does.

   No test framework — Node, one file, no dependencies, same as the
   rest of the project.
   ============================================================ */

import { createRecorder, simplify, simplifyTrack, countPoints, metres } from "../js/track.js";

const out = [];
const ok = (name, cond, detail) => out.push(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);

/* ---- 1. the literal crash: spread on a huge array ---- */
const huge = [];
for (let i = 0; i < 200000; i++) huge.push([-37.81 + i * 1e-6, 144.96 + Math.sin(i / 900) * 0.01]);
let spreadCrashed = false;
try { Math.min(...huge.map((p) => p[0])); } catch (e) { spreadCrashed = e.constructor.name; }
ok("Math.min(...200k) really does throw", !!spreadCrashed, String(spreadCrashed));

/* ---- 2. simplify survives what spread does not ---- */
let t0 = Date.now();
const thin = simplify(huge, 6);
const simplifyMs = Date.now() - t0;
ok("simplify(200k) does not overflow the stack", thin.length > 1);
ok("simplify(200k) actually thins it", thin.length < huge.length / 20,
   `${huge.length} -> ${thin.length} points in ${simplifyMs}ms`);

/* ---- 3. simplification must not move the LINE, which is what
        Douglas-Peucker actually bounds. Measuring distance to the
        nearest kept VERTEX (my first attempt) fails on a smooth curve
        for a legitimate reason: a point can sit exactly on the kept
        line while being 600 m from either end of it. ---- */
function maxDeviation(orig, kept, tol) {
  const toRad = (d) => (d * Math.PI) / 180;
  const kx = 111320 * Math.cos(toRad(orig[0][0])), ky = 110540;
  const K = kept.map((p) => [p[1] * kx, p[0] * ky]);
  let worst = 0;
  for (let i = 0; i < orig.length; i += 37) {
    const px = orig[i][1] * kx, py = orig[i][0] * ky;
    let best = Infinity;
    for (let j = 0; j + 1 < K.length; j++) {
      const ax = K[j][0], ay = K[j][1];
      const dx = K[j + 1][0] - ax, dy = K[j + 1][1] - ay;
      const len2 = dx * dx + dy * dy;
      let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = px - ax - t * dx, ey = py - ay - t * dy;
      const d = Math.sqrt(ex * ex + ey * ey);
      if (d < best) best = d;
      if (best <= tol) break;
    }
    if (best > worst) worst = best;
  }
  return worst;
}
const dev = maxDeviation(huge, thin, 6);
ok("thinned line never strays past the tolerance", dev <= 6.5, `worst deviation from the drawn line ${dev.toFixed(2)} m (tolerance 6 m)`);

/* ---- 4. gaps are never smoothed over ---- */
const gapped = [[-37.8, 144.9], [-37.81, 144.91], null, [-37.9, 145.0], [-37.91, 145.01]];
const gs = simplifyTrack(gapped, 6);
ok("simplifyTrack preserves the pen-lift", gs.includes(null), JSON.stringify(gs.map((p) => (p ? "pt" : "GAP"))));

/* ---- 5. the recorder's gates, on a realistic hostile feed ---- */
const rec = createRecorder();
rec.start(0);
let at = 0;
let sent = 0;
const R = (() => { let s = 12345; return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648); })();

let lat = -37.8136, lng = 144.9631;
for (let i = 0; i < 50000; i++) {
  at += 1000;
  sent++;
  const roll = R();
  if (roll < 0.10) {
    /* a vague fix the device admits is bad */
    rec.accept({ lat: lat + (R() - 0.5) * 0.002, lng: lng + (R() - 0.5) * 0.002, accuracy: 60 + R() * 90, at });
  } else if (roll < 0.13) {
    /* a GPS teleport */
    rec.accept({ lat: lat + 0.05, lng: lng + 0.05, accuracy: 9, at });
  } else if (roll < 0.45) {
    /* standing still at a lookout — jitter inside a few metres */
    rec.accept({ lat: lat + (R() - 0.5) * 0.00004, lng: lng + (R() - 0.5) * 0.00004, accuracy: 7, at });
  } else {
    /* actually walking, ~1.4 m/s */
    lat += 0.0000108 * (1 + R() * 0.4);
    lng += 0.0000098 * (R() - 0.2);
    rec.accept({ lat, lng, accuracy: 5 + R() * 6, at });
  }
}

const kept = countPoints(rec.pts);
ok("50,000 fixes do not blow up the live array", rec.pts.length <= rec.cfg.softCap * 1.1,
   `${sent} fixes in, ${rec.pts.length} entries held (soft cap ${rec.cfg.softCap})`);
ok("weak/teleport fixes were rejected", rec.rejected > 0, `${rec.rejected} rejected`);
ok("distance is plausible for the walk", rec.distance > 0,
   `${(rec.distance / 1000).toFixed(2)} km over ${(at / 3600000).toFixed(1)} h`);

/* ---- 6. distance must survive simplification unchanged ---- */
const before = Math.round(rec.distance);
const row = rec.toRow();
ok("simplification does not shrink the recorded distance", row.distance_m === before,
   `${before} m -> ${row.distance_m} m`);
ok("saved payload is small", JSON.stringify(row.route).length < 120000,
   `${(JSON.stringify(row.route).length / 1024).toFixed(0)} KB for ${countPoints(row.route)} points`);

/* ---- 7. a long silence becomes a gap, not a straight line ---- */
const r2 = createRecorder();
r2.start(0);
r2.accept({ lat: -37.8, lng: 144.9, accuracy: 5, at: 1000 });
r2.accept({ lat: -37.8001, lng: 144.9001, accuracy: 5, at: 2000 });
const dBefore = r2.distance;
r2.accept({ lat: -37.85, lng: 144.95, accuracy: 5, at: 600000 });  /* ten minutes later, far away */
ok("a long silence inserts a gap", r2.pts.includes(null), `${r2.gaps} gap(s)`);
ok("distance is not claimed across a gap", Math.round(r2.distance) === Math.round(dBefore),
   `${dBefore.toFixed(1)} m -> ${r2.distance.toFixed(1)} m`);

/* ---- 8. snapshot / restore round-trips ---- */
const snap = JSON.parse(JSON.stringify(rec.snapshot()));
const r3 = createRecorder();
ok("an interrupted walk can be restored", r3.restore(snap) && Math.round(r3.distance) === before,
   `${Math.round(r3.distance)} m restored`);

/* ---- 9. no spread over track arrays anywhere in the two modules.
        Comments must be stripped first — both files TALK about
        `Math.min(...array)` being the crash, and a naive grep flags
        the warning as the offence. ---- */
import { readFileSync } from "node:fs";
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
for (const f of ["track.js", "routemap.js"]) {
  const code = strip(readFileSync(new URL(`../js/${f}`, import.meta.url), "utf8"));
  const hits = [
    ...(code.match(/Math\.(min|max)\(\s*\.\.\./g) || []),
    ...(code.match(/\.push\(\s*\.\.\./g) || []),
  ];
  ok(`${f} never spreads a track array`, hits.length === 0, hits.length ? hits.join(" ") : "no spread over an array in executable code");
}

console.log(out.join("\n"));
console.log("\n" + (out.some((l) => l.startsWith("FAIL")) ? "SOME CHECKS FAILED" : "ALL CHECKS PASSED"));
