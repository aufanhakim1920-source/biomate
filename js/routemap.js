/* ============================================================
   Biomate — drawing a route without redrawing it every second

   The other half of Aufan's question. Gating and simplification keep
   the ARRAY small; this keeps the DRAWING cheap.

   The naive version redraws the whole track on every fix. That is
   O(n²) over a walk, and it is also visibly wasteful: 99% of the time
   the only thing that changed is one new segment at the end.

   So:

     · the line lives on a canvas that is only ever ADDED to
     · the moving dot lives on a SECOND canvas stacked on top, which
       is the only thing cleared each frame — otherwise the dot would
       smear a trail of stale dots along the route
     · a full redraw happens only when a new point falls outside the
       current view, and each redraw inflates the view by 18% beyond
       the data, so redraws get rarer as the walk grows. Over a long
       walk that is a handful of redraws, not fourteen thousand.

   `null` in the point array means the pen lifted. It is drawn as an
   actual break, because joining across a gap would draw a straight
   line through terrain you never walked.
   ============================================================ */

import { el } from "./ui.js";
import { segments } from "./track.js";

const PAD = 44;
const INFLATE = 0.18;

/* bounds without spread — Math.min(...pts) is a stack overflow on a
   long track, which is the exact failure this file exists to avoid */
function bounds(pts) {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity, n = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p === null) continue;
    n++;
    if (p[0] < minLat) minLat = p[0];
    if (p[0] > maxLat) maxLat = p[0];
    if (p[1] < minLng) minLng = p[1];
    if (p[1] > maxLng) maxLng = p[1];
  }
  if (!n) return null;
  return { minLat, maxLat, minLng, maxLng };
}

function inflate(b, by = INFLATE) {
  /* a floor, so a track that has barely moved does not get magnified
     into a huge shaky scribble */
  const dLat = Math.max((b.maxLat - b.minLat) * by, 0.0006);
  const dLng = Math.max((b.maxLng - b.minLng) * by, 0.0006);
  return {
    minLat: b.minLat - dLat, maxLat: b.maxLat + dLat,
    minLng: b.minLng - dLng, maxLng: b.maxLng + dLng,
  };
}

function projector(view, W, H, pad = PAD) {
  const spanLat = view.maxLat - view.minLat || 1e-6;
  const spanLng = view.maxLng - view.minLng || 1e-6;
  /* longitude degrees are shorter than latitude degrees away from the
     equator — without this a route in Melbourne comes out stretched
     sideways by about 20% */
  const kx = Math.cos((((view.minLat + view.maxLat) / 2) * Math.PI) / 180);
  const wLng = spanLng * kx;
  const s = Math.min((W - pad * 2) / wLng, (H - pad * 2) / spanLat);
  const offX = (W - wLng * s) / 2;
  const offY = (H - spanLat * s) / 2;
  return (p) => [
    offX + (p[1] - view.minLng) * kx * s,
    H - offY - (p[0] - view.minLat) * s,
  ];
}

function paper(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#FBEFE6");
  g.addColorStop(1, "#F1DACA");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function strokeSegs(ctx, segs, px, k = 1) {
  /* two passes: a soft halo underneath, then the line. Drawn as two
     full passes so the halo never sits on top of an earlier stroke. */
  const pass = (width, colour) => {
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = colour;
    ctx.beginPath();
    for (let s = 0; s < segs.length; s++) {
      const seg = segs[s];
      for (let i = 0; i < seg.length; i++) {
        const [x, y] = px(seg[i]);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  };
  pass(13 * k, "rgba(210,85,42,.20)");
  pass(Math.max(1.4, 5 * k), "#C14E27");
}

function startFlag(ctx, p, px, k = 1) {
  const [x, y] = px(p);
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(x, y, 9 * k, 0, 7); ctx.fill();
  ctx.fillStyle = "#2E6B2E";
  ctx.beginPath(); ctx.arc(x, y, 5.5 * k, 0, 7); ctx.fill();
}

/* ------------------------------------------------------------
   A finished route, drawn once.
   ------------------------------------------------------------ */
export function drawRoute(canvas, pts, opts = {}) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  /* one scale factor drives stroke width, padding and marker size, so
     the same function draws a full-page map and a 96px shelf
     thumbnail without either looking wrong */
  const k = Math.min(1, Math.min(W, H) / 500);
  ctx.clearRect(0, 0, W, H);
  paper(ctx, W, H);

  const b = bounds(pts || []);
  if (!b) {
    if (opts.empty !== false) {
      ctx.fillStyle = "#A39E99";
      ctx.font = `${Math.round(24 * Math.max(k, 0.5))}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(opts.empty || "No route was recorded for this walk", W / 2, H / 2);
    }
    return;
  }

  const view = inflate(b);
  const px = projector(view, W, H, opts.pad != null ? opts.pad : PAD * k);
  const segs = segments(pts);
  strokeSegs(ctx, segs, px, k);

  if (opts.markers === false) return;

  if (segs.length && segs[0].length) startFlag(ctx, segs[0][0], px, k);

  const lastSeg = segs[segs.length - 1];
  if (lastSeg && lastSeg.length) {
    const [x, y] = px(lastSeg[lastSeg.length - 1]);
    ctx.fillStyle = "#2A2724";
    ctx.beginPath(); ctx.arc(x, y, 8 * k, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x, y, 3.5 * k, 0, 7); ctx.fill();
  }
}

/* ------------------------------------------------------------
   A route being recorded right now.
   ------------------------------------------------------------ */
export function createRouteCanvas(w = 800, h = 500) {
  const line = el("canvas", {
    class: "route", width: String(w), height: String(h),
    role: "img", "aria-label": "Your route so far. Nothing recorded yet.",
  });
  const dot = el("canvas", { class: "route route--dot", width: String(w), height: String(h), "aria-hidden": "true" });
  const node = el("div", { class: "routewrap" }, [line, dot]);

  const lctx = line.getContext("2d");
  const dctx = dot.getContext("2d");

  let view = null;
  let px = null;
  let pts = [];
  let lastDrawn = null;   /* last point already on the line canvas */
  let redraws = 0;

  function blank() {
    lctx.clearRect(0, 0, w, h);
    paper(lctx, w, h);
    dctx.clearRect(0, 0, w, h);
    lctx.fillStyle = "#A39E99";
    lctx.font = "24px system-ui, sans-serif";
    lctx.textAlign = "center";
    lctx.fillText("Your route draws itself here once you start", w / 2, h / 2);
  }

  function full() {
    redraws++;
    const b = bounds(pts);
    if (!b) { blank(); return; }
    view = inflate(b);
    px = projector(view, w, h);
    lctx.clearRect(0, 0, w, h);
    paper(lctx, w, h);
    const segs = segments(pts);
    strokeSegs(lctx, segs, px);
    if (segs.length && segs[0].length) startFlag(lctx, segs[0][0], px);
    lastDrawn = null;
    for (let i = pts.length - 1; i >= 0; i--) if (pts[i] !== null) { lastDrawn = pts[i]; break; }
    marker();
  }

  function inView(p) {
    return view &&
      p[0] >= view.minLat && p[0] <= view.maxLat &&
      p[1] >= view.minLng && p[1] <= view.maxLng;
  }

  function marker() {
    dctx.clearRect(0, 0, w, h);
    if (!lastDrawn || !px) return;
    const [x, y] = px(lastDrawn);
    dctx.fillStyle = "rgba(46,107,46,.22)";
    dctx.beginPath(); dctx.arc(x, y, 16, 0, 7); dctx.fill();
    dctx.fillStyle = "#2E6B2E";
    dctx.beginPath(); dctx.arc(x, y, 9, 0, 7); dctx.fill();
    dctx.fillStyle = "#fff";
    dctx.beginPath(); dctx.arc(x, y, 3.6, 0, 7); dctx.fill();
  }

  /* the hot path — called once per accepted fix */
  function append(p) {
    pts.push(p);

    if (p === null) { lastDrawn = null; return; }

    if (!view || !inView(p)) { full(); return; }

    if (lastDrawn) {
      const a = px(lastDrawn), b = px(p);
      lctx.lineJoin = "round"; lctx.lineCap = "round";
      lctx.lineWidth = 13; lctx.strokeStyle = "rgba(210,85,42,.20)";
      lctx.beginPath(); lctx.moveTo(a[0], a[1]); lctx.lineTo(b[0], b[1]); lctx.stroke();
      lctx.lineWidth = 5; lctx.strokeStyle = "#C14E27";
      lctx.beginPath(); lctx.moveTo(a[0], a[1]); lctx.lineTo(b[0], b[1]); lctx.stroke();
    } else {
      startFlag(lctx, p, px);
    }

    lastDrawn = p;
    marker();
  }

  /* the recorder re-simplifies its own array occasionally, which
     replaces the object we are holding — so re-sync and repaint.
     Copied, not aliased: the recorder keeps mutating its array and a
     shared reference would let it silently desync `count`. */
  function setPoints(next) {
    pts = next.slice();
    full();
  }

  function describe(text) { line.setAttribute("aria-label", text); }

  blank();

  return {
    node,
    canvas: line,
    append,
    setPoints,
    redraw: full,
    describe,
    get count() { return pts.length; },
    get redraws() { return redraws; },
  };
}
