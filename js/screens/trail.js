/* ============================================================
   Biomate — the trail recorder (Milestone 3)

   Yes, this is real. `navigator.geolocation.watchPosition` is the
   device's actual GPS, the same feed Strava uses on a phone; the
   route is measured, saved to `trail_logs`, and drawn again later on
   the walk screen.

   Aufan's worry — "these line cant be like overlap it will crash if
   too much" — was correct about the first version, and the two
   modules this screen is built on exist because of it:

     js/track.js     accuracy / speed / movement gating, then
                     Douglas-Peucker, so the ARRAY stays small
     js/routemap.js  append-only drawing on a static canvas with the
                     moving dot on a second canvas, so the DRAWING
                     stays cheap

   What is still honestly true, and stated on screen rather than
   buried here:

   · A browser cannot record with the screen off. Screen Wake Lock
     keeps the display awake while the tab is visible, which covers
     "phone in your hand"; it does not survive the lock button. A
     native app would. This one says so.
   · Switching apps suspends the tab. Rather than pretend, that gets
     recorded as a GAP and drawn as a break in the line.
   · The recording is checkpointed to localStorage as it goes, so a
     crashed tab or an accidental back-swipe does not lose the walk —
     it offers to resume.
   ============================================================ */

import { DB } from "../db.js";
import { el, toast, fmtDistance, fmtDuration } from "../ui.js";
import { icon } from "../icons.js";
import { say } from "../a11y.js";
import { createRecorder, countPoints } from "../track.js";
import { createRouteCanvas } from "../routemap.js";
import { back, go } from "../router.js";

const DRAFT = "biomate/trail-draft";

export async function trail({ id }) {
  const meId = DB.uid();
  const [rows, members, profiles] = await Promise.all([
    id ? DB.list("hikes", { filter: { id }, limit: 1 }) : Promise.resolve([]),
    DB.list("hike_members"),
    DB.list("profiles"),
  ]);
  const h = rows[0] || null;
  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const withMe = h
    ? members.filter((m) => m.hike_id === h.id && m.status !== "left" && m.user_id !== meId)
    : [];

  const wrap = el("div");
  wrap.append(
    el("div", { class: "topbar topbar--left" }, [
      el("button", { class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back", html: icon("back", { size: 20 }), onclick: back }),
      el("h1", { class: "display", style: "font-size:1.5rem", text: "On trail" }),
    ])
  );
  if (h) wrap.append(el("p", { class: "meta", style: "padding:0 20px 8px", text: h.title }));

  /* ---- live numbers ---- */
  const dEl = el("span", { class: "big", text: "0.00" });
  const tEl = el("span", { class: "big", text: "0:00" });
  const pEl = el("span", { class: "big", text: "—" });

  wrap.append(
    el("div", { class: "trailstats", role: "group", "aria-label": "Live trail statistics" }, [
      el("div", { class: "trailstat" }, [dEl, el("span", { class: "stat__l", text: "kilometres" })]),
      el("div", { class: "trailstat" }, [tEl, el("span", { class: "stat__l", text: "elapsed" })]),
      el("div", { class: "trailstat" }, [pEl, el("span", { class: "stat__l", text: "min / km" })]),
    ])
  );

  /* ---- signal, and what the gating is doing ----
     Shown because a recorder that silently discards fixes looks
     broken. Seeing "3 ignored" while you stand still is the feature
     explaining itself. */
  const sig = el("span", { class: "sig__dot", "aria-hidden": "true" });
  const sigText = el("span", { class: "sig__text", text: "Not recording" });
  const sigLine = el("p", { class: "sig" }, [sig, sigText]);
  wrap.append(sigLine);

  /* ---- the route ---- */
  const map = createRouteCanvas(880, 560);
  wrap.append(el("div", { class: "block" }, [map.node]));

  const live = el("p", { class: "sr-only", "aria-live": "polite" });
  wrap.append(live);

  if (withMe.length) {
    wrap.append(el("div", { class: "block" }, [
      el("p", { class: "tiny", text: "WALKING WITH" }),
      el("div", { class: "avstack", style: "margin-top:8px" }, withMe.slice(0, 5).map((m) =>
        el("div", {
          class: "avatar",
          style: "background:#e9ded4;display:grid;place-items:center;font-weight:700",
          text: ((byId[m.user_id] || {}).display_name || "?")[0].toUpperCase(),
        })
      )),
    ]));
  }

  /* ---- state ---- */
  const rec = createRecorder();
  let recording = false;
  let watchId = null;
  let ticker = null;
  let demo = null;
  let wake = null;
  let nextKm = 1;
  let saving = false;
  let resumeBar = null;

  /* `onclick: start` would hand the MouseEvent straight into
     start(resumed) as a truthy first argument, so rec.start() would be
     skipped and the recording would have no start time at all. Wrap
     it. This is a one-character-class bug that silently produces a
     working-looking screen recording nothing. */
  const startBtn = el("button", { class: "btn btn--primary btn--block", type: "button", text: "Start recording", onclick: () => start() });
  const stopBtn = el("button", { class: "btn btn--ghost btn--block", type: "button", text: "Finish and save", disabled: true, onclick: finish });
  wrap.append(el("div", { class: "block" }, [startBtn, el("div", { style: "height:10px" }), stopBtn]));

  const caveat = el("p", { class: "tiny", style: "padding:4px 20px 0" });
  wrap.append(caveat);
  caveat.textContent =
    "A browser cannot record with the screen off. This keeps the screen awake while the app is open, " +
    "but locking the phone still stops it — and when that happens the line breaks rather than guessing " +
    "across the missing part. That is a real limit of the web, not a bug.";

  /* ---- resume a walk that was interrupted ---- */
  /* Only offer back a walk that actually went somewhere. A draft with
     points but no distance is a recording that never got moving, and
     offering to "resume" 0.00 km is worse than saying nothing. */
  const draft = readDraft();
  if (draft && Array.isArray(draft.pts) && countPoints(draft.pts) > 1 && draft.distance > 50) {
    const km = (draft.distance / 1000).toFixed(2);
    const bar = el("div", { class: "resume" }, [
      el("p", { class: "resume__t", text: `You have an unfinished walk — ${km} km already recorded.` }),
      el("div", { class: "resume__row" }, [
        el("button", {
          class: "btn btn--primary", type: "button", text: "Resume it",
          onclick: () => { rec.restore(draft); map.setPoints(rec.pts); paint(); dropResume(); start(true); },
        }),
        el("button", {
          class: "btn btn--ghost", type: "button", text: "Discard",
          onclick: () => { localStorage.removeItem(DRAFT); dropResume(); say("Discarded."); },
        }),
      ]),
    ]);
    resumeBar = bar;
    wrap.insertBefore(bar, sigLine);
  }

  function dropResume() {
    if (resumeBar) { resumeBar.remove(); resumeBar = null; }
  }

  /* ============================================================
     recording
     ============================================================ */

  function readDraft() {
    try { return JSON.parse(localStorage.getItem(DRAFT) || "null"); } catch { return null; }
  }

  function saveDraft() {
    try { localStorage.setItem(DRAFT, JSON.stringify(rec.snapshot())); }
    catch { /* private mode or a full quota — losing the checkpoint is
                survivable, losing the recording to an exception is not */ }
  }

  function paint() {
    const kept = countPoints(rec.pts);
    dEl.textContent = (rec.distance / 1000).toFixed(2);
    const s = rec.startedAt ? (rec.now() - rec.startedAt) / 1000 : 0;
    /* m:ss reads fine for an hour and turns into "184:07" after that,
       which nobody can parse at a glance mid-walk */
    tEl.textContent = s >= 3600
      ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`
      : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    pEl.textContent = rec.distance > 50 ? (s / 60 / (rec.distance / 1000)).toFixed(1) : "—";
    map.describe(`Your route so far: ${fmtDistance(rec.distance)} over ${kept} points.`);
  }

  function signal(state, note) {
    sig.dataset.state = state;
    sigText.textContent = note;
  }

  function onFix(fix) {
    const before = rec.pts;
    const res = rec.accept(fix);

    if (rec.pts !== before) {
      /* the recorder re-simplified — its array is a new object */
      map.setPoints(rec.pts);
    } else if (res.added) {
      for (let i = map.count; i < rec.pts.length; i++) map.append(rec.pts[i]);
    }

    const acc = rec.accuracy == null ? null : Math.round(rec.accuracy);
    const kept = countPoints(rec.pts);
    const parts = [];
    if (acc != null) parts.push(`GPS ±${acc} m`);
    parts.push(`${kept} point${kept === 1 ? "" : "s"} kept`);
    if (rec.rejected) parts.push(`${rec.rejected} ignored`);
    if (rec.gaps) parts.push(`${rec.gaps} break${rec.gaps === 1 ? "" : "s"}`);
    signal(acc == null ? "on" : acc <= 12 ? "on" : acc <= 25 ? "weak" : "bad", parts.join(" · "));

    if (res.added) { paint(); saveDraft(); milestone(); }
  }

  /* the milestone callout — built for blind users, better for
     everyone, because the phone is in a pocket */
  function milestone() {
    if (rec.distance < nextKm * 1000) return;
    const mins = Math.round((rec.now() - rec.startedAt) / 60000);
    const line = `${nextKm} kilometre${nextKm === 1 ? "" : "s"}. ${mins} minute${mins === 1 ? "" : "s"}.`;
    live.textContent = line;
    say(line, true);
    toast(line);
    nextKm += 1;
  }

  async function keepAwake() {
    if (!("wakeLock" in navigator)) return;
    try { wake = await navigator.wakeLock.request("screen"); }
    catch { /* refused (low battery, or not a user gesture) — the
                recording is still fine, the screen just may sleep */ }
  }

  /* Backgrounding the tab suspends the fix stream. Mark it as a gap
     immediately rather than letting the next fix draw a straight line
     across however far you walked while it was asleep. */
  function onVisibility() {
    if (!recording) return;
    if (document.hidden) {
      rec.markGap();
      map.setPoints(rec.pts);
      saveDraft();
      signal("weak", "Paused — the app was in the background");
    } else {
      keepAwake();
      signal("on", "Recording again");
    }
  }

  function start(resumed = false) {
    if (recording) return;
    recording = true;
    /* starting fresh supersedes the offer — leaving it on screen while
       a new walk records reads as two recordings running at once */
    dropResume();
    if (!resumed) rec.start();
    nextKm = Math.floor(rec.distance / 1000) + 1;

    startBtn.disabled = true;
    stopBtn.disabled = false;
    ticker = setInterval(paint, 1000);
    document.addEventListener("visibilitychange", onVisibility);
    keepAwake();
    signal("wait", "Waiting for a GPS fix…");
    say(resumed ? "Recording resumed." : "Recording started.");

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => onFix({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          altitudeAccuracy: pos.coords.altitudeAccuracy,
          at: pos.timestamp || Date.now(),
        }),
        (err) => { console.warn("[trail] geolocation", err); startDemo(); },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
      );
      /* if nothing arrives, fall back rather than sit on a spinner —
         a silent capability failure reads as broken */
      setTimeout(() => { if (!rec.accepted) startDemo(); }, 9000);
    } else {
      startDemo();
    }
  }

  /* Without a location permission there is nothing to draw, so this
     replays a sample track. LABELLED, not disguised — and it goes
     through the same recorder, so what you see is the real gating
     behaving normally, not a prettier fake path. */
  function startDemo() {
    if (demo || !recording) return;
    caveat.textContent = "⚠️ DEMO WALK — no location permission, so this is a replayed sample track, not a real recording. Everything else on this screen is the real code.";
    caveat.style.color = "var(--brand-text)";
    say("No location available, so this is a demonstration walk.");

    /* Fast-forward: each 200ms tick advances the recording's clock by
       40 seconds, which puts the synthetic pace at a believable
       4-5 km/h. The gates then see an ordinary walk and behave exactly
       as they would outdoors — which is the point of demoing at all. */
    let t = 0;
    let simAt = rec.startedAt || Date.now();
    rec.setClock(() => simAt);
    /* ⚠️ STEP must stay under the recorder's gapMs (20s) or every
       synthetic fix arrives after a "long silence" and the whole demo
       renders as 150 disconnected breaks. The geometry below is scaled
       to STEP so the implied pace lands around 5 km/h — fast enough to
       watch, slow enough to pass the speed gate. */
    const STEP = 15000;
    const lat0 = -37.8136, lng0 = 144.9631;   /* Melbourne */
    demo = setInterval(() => {
      t += 1;
      simAt += STEP;
      onFix({
        lat: lat0 + Math.sin(t / 14) * 0.002 + t * 0.00018,
        lng: lng0 + Math.cos(t / 11) * 0.0025 + t * 0.00014,
        accuracy: 6 + Math.random() * 5,
        altitude: null,
        altitudeAccuracy: null,
        at: simAt,
      });
      if (t > 150) { clearInterval(demo); demo = null; signal("on", "Demo walk finished"); }
    }, 200);
  }

  function stopAll() {
    recording = false;
    if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    if (ticker) { clearInterval(ticker); ticker = null; }
    if (demo) { clearInterval(demo); demo = null; }
    document.removeEventListener("visibilitychange", onVisibility);
    if (wake) { try { wake.release(); } catch { /* already gone */ } wake = null; }
  }

  async function finish() {
    if (saving) return;
    saving = true;
    stopBtn.disabled = true;
    stopAll();

    const row = rec.toRow();
    if (countPoints(row.route) < 2) {
      toast("Nothing was recorded — no fixes came through.");
      say("Nothing was recorded.");
      saving = false;
      startBtn.disabled = false;
      return;
    }

    const saved = await DB.insert("trail_logs", {
      hike_id: h ? h.id : null,
      user_id: meId,
      ...row,
    });
    localStorage.removeItem(DRAFT);

    const line = `Saved. ${fmtDistance(row.distance_m)} in ${fmtDuration(row.duration_s)}.`;
    toast(line);
    say(line, true);
    setTimeout(() => go(saved && saved.id ? `walk/${saved.id}` : "profile"), 700);
  }

  /* leaving the screen must not leave a GPS watch and a wake lock
     running for the rest of the session */
  wrap.addEventListener("screen:leave", () => { if (recording) saveDraft(); stopAll(); });

  paint();
  return wrap;
}
