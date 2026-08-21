/* ============================================================
   Biomate — the trail recorder (Milestone 3)

   Strava-shaped: distance, elapsed time, pace, the route drawing
   itself on a canvas, and who is walking with you.

   ⚠️ Two honesty notes, both surfaced in the UI rather than buried:

   1. GPS in a browser stops when the phone locks. `watchPosition`
      dies with the tab, so a real recording of a six-hour walk is not
      something a web app can promise. The screen says so.
   2. Without a location permission there is nothing to draw, so it
      falls back to a clearly-labelled DEMO WALK — a replayed sample
      track. Labelled, not disguised.

   The milestone callouts are the accessibility feature that is just a
   better feature: your phone is in your pocket while you walk, so
   hearing "three kilometres, forty-seven minutes" beats looking.
   ============================================================ */

import { DB } from "../db.js";
import { el, toast, fmtDistance, fmtDuration } from "../ui.js";
import { icon } from "../icons.js";
import { say } from "../a11y.js";
import { back, go } from "../router.js";

/* haversine, metres */
function metres(a, b) {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]), dLon = toRad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export async function trail({ id }) {
  const meId = DB.uid();
  const [rows, members, profiles] = await Promise.all([
    id ? DB.list("hikes", { filter: { id }, limit: 1 }) : Promise.resolve([]),
    DB.list("hike_members"),
    DB.list("profiles"),
  ]);
  const h = rows[0] || null;
  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const withMe = h ? members.filter((m) => m.hike_id === h.id && m.status !== "left" && m.user_id !== meId) : [];

  const wrap = el("div");
  wrap.append(
    el("div", { class: "topbar topbar--left" }, [
      el("button", { class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back", html: icon("back", { size: 20 }), onclick: back }),
      el("h1", { class: "display", style: "font-size:1.5rem", text: "On trail" }),
    ])
  );
  if (h) wrap.append(el("p", { class: "meta", style: "padding:0 20px 8px", text: h.title }));

  /* ---- live numbers ---- */
  const dEl = el("span", { class: "big", text: "0.0" });
  const tEl = el("span", { class: "big", text: "0:00" });
  const pEl = el("span", { class: "big", text: "—" });

  wrap.append(
    el("div", { class: "trailstats", role: "group", "aria-label": "Live trail statistics" }, [
      el("div", { class: "trailstat" }, [dEl, el("span", { class: "stat__l", text: "kilometres" })]),
      el("div", { class: "trailstat" }, [tEl, el("span", { class: "stat__l", text: "elapsed" })]),
      el("div", { class: "trailstat" }, [pEl, el("span", { class: "stat__l", text: "min / km" })]),
    ])
  );

  /* ---- the route, drawn ---- */
  const canvas = el("canvas", { class: "route", width: "800", height: "500", role: "img", "aria-label": "Your route so far" });
  wrap.append(el("div", { class: "block" }, [canvas]));

  const live = el("p", { class: "sr-only", "aria-live": "polite" });
  wrap.append(live);

  if (withMe.length) {
    wrap.append(el("div", { class: "block" }, [
      el("p", { class: "tiny", text: "WALKING WITH" }),
      el("div", { class: "avstack", style: "margin-top:8px" }, withMe.slice(0, 5).map((m) =>
        el("div", { class: "avatar", style: `background:#e9ded4;display:grid;place-items:center;font-weight:700`, text: ((byId[m.user_id] || {}).display_name || "?")[0].toUpperCase() })
      )),
    ]));
  }

  /* ---- state ---- */
  let route = [];
  let dist = 0;
  let startedAt = 0;
  let watchId = null;
  let ticker = null;
  let demo = null;
  let nextKm = 1;

  const startBtn = el("button", { class: "btn btn--primary btn--block", type: "button", text: "Start recording", onclick: start });
  const stopBtn = el("button", { class: "btn btn--ghost btn--block", type: "button", text: "Finish and save", onclick: finish, disabled: true });
  wrap.append(el("div", { class: "block" }, [startBtn, el("div", { style: "height:10px" }), stopBtn]));

  const caveat = el("p", { class: "tiny", style: "padding:4px 20px 0" });
  wrap.append(caveat);
  caveat.textContent =
    "Heads up: a browser stops recording when the phone locks or you switch apps. " +
    "Keep the screen on for a real walk — a native app would handle this better, and that's an honest limit, not a bug.";

  function draw() {
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#FBEFE6");
    grad.addColorStop(1, "#F3DFD0");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    if (route.length < 2) {
      ctx.fillStyle = "#A39E99";
      ctx.font = "26px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Your route appears here once you start", W / 2, H / 2);
      return;
    }

    const lats = route.map((p) => p[0]), lngs = route.map((p) => p[1]);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const pad = 60;
    const sx = (maxLng - minLng) ? (W - pad * 2) / (maxLng - minLng) : 1;
    const sy = (maxLat - minLat) ? (H - pad * 2) / (maxLat - minLat) : 1;
    const s = Math.min(sx, sy);
    const px = (p) => [pad + (p[1] - minLng) * s, H - pad - (p[0] - minLat) * s];

    ctx.lineWidth = 12; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(210,85,42,.22)";
    ctx.beginPath(); route.forEach((p, i) => { const [x, y] = px(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();

    ctx.lineWidth = 5;
    ctx.strokeStyle = "#C14E27";
    ctx.beginPath(); route.forEach((p, i) => { const [x, y] = px(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();

    const [ex, ey] = px(route[route.length - 1]);
    ctx.fillStyle = "#2E6B2E"; ctx.beginPath(); ctx.arc(ex, ey, 10, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex, ey, 4, 0, 7); ctx.fill();

    canvas.setAttribute("aria-label", `Route so far: ${fmtDistance(dist)} over ${route.length} points.`);
  }

  function push(lat, lng) {
    const p = [lat, lng];
    if (route.length) dist += metres(route[route.length - 1], p);
    route.push(p);
    draw();
    tick();

    /* the milestone callout — built for blind users, better for
       everyone, because the phone is in a pocket */
    if (dist >= nextKm * 1000) {
      const mins = Math.round((Date.now() - startedAt) / 60000);
      const line = `${nextKm} kilometre${nextKm === 1 ? "" : "s"}. ${mins} minute${mins === 1 ? "" : "s"}.`;
      live.textContent = line;
      say(line, true);
      toast(line);
      nextKm += 1;
    }
  }

  function tick() {
    const s = startedAt ? (Date.now() - startedAt) / 1000 : 0;
    dEl.textContent = (dist / 1000).toFixed(2);
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    tEl.textContent = `${m}:${String(sec).padStart(2, "0")}`;
    pEl.textContent = dist > 50 ? (s / 60 / (dist / 1000)).toFixed(1) : "—";
  }

  function start() {
    startedAt = Date.now();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    ticker = setInterval(tick, 1000);
    say("Recording started.");

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => push(pos.coords.latitude, pos.coords.longitude),
        (err) => { console.warn("[trail] geolocation", err); startDemo(); },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
      );
      /* if nothing arrives in 9s, fall back rather than sit on a
         spinner — a silent capability failure reads as broken */
      setTimeout(() => { if (!route.length) startDemo(); }, 9000);
    } else {
      startDemo();
    }
  }

  function startDemo() {
    if (demo) return;
    caveat.textContent = "⚠️ DEMO WALK — no location permission, so this is a replayed sample track, not a real recording.";
    caveat.style.color = "var(--brand-text)";
    say("No location available, so this is a demonstration walk.");
    let t = 0;
    const lat0 = -37.8136, lng0 = 144.9631;   /* Melbourne */
    demo = setInterval(() => {
      t += 1;
      push(lat0 + Math.sin(t / 9) * 0.004 + t * 0.00035,
           lng0 + Math.cos(t / 7) * 0.005 + t * 0.00028);
      if (t > 220) { clearInterval(demo); demo = null; }
    }, 220);
  }

  async function finish() {
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    if (ticker) clearInterval(ticker);
    if (demo) { clearInterval(demo); demo = null; }
    stopBtn.disabled = true;

    const duration = Math.round((Date.now() - startedAt) / 1000);
    await DB.insert("trail_logs", {
      hike_id: h ? h.id : null,
      user_id: meId,
      distance_m: Math.round(dist),
      duration_s: duration,
      ascent_m: 0,
      route,
    });
    const line = `Saved. ${fmtDistance(dist)} in ${fmtDuration(duration)}.`;
    toast(line);
    say(line, true);
    setTimeout(() => go("profile"), 900);
  }

  draw();
  tick();
  return wrap;
}
