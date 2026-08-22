/* ============================================================
   Biomate — availability ("Calendar Availability" in the Figma)

   Milestone 2 of the brief, LettuceMeet-shaped: a week across, hours
   down, drag to paint when you're free, and a heatmap of where
   everyone overlaps.

   ⚠️ This is the least accessible interaction in the app, so the
   keyboard path is built first, not retrofitted:
     · every cell is a real toggle button with aria-pressed
     · arrow keys move, space/enter toggles
     · a whole-day button per column, because tabbing 105 cells is
       technically accessible and practically cruel
     · the heatmap NEVER communicates by colour alone — each cell's
       accessible name states the count, and the winning slot is
       written out in words above the grid
   ============================================================ */

import { DB } from "../db.js";
import { el, toast } from "../ui.js";
import { icon } from "../icons.js";
import { say } from "../a11y.js";
import { back, go } from "../router.js";
import { planHeader, planTiles } from "./plan.js";

const START_HOUR = 6;
const END_HOUR = 20;

const key = (day, hour) => `${day}:${String(hour).padStart(2, "0")}`;
const dayLabel = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric" });
const hourLabel = (h) => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;


/* "Waiting on You, jeffrey.jiang and 4 more" read badly — you are not
   waiting on yourself. Split the reader out and address them directly. */
function waitingText(waiting, responded, joined, byId, meId) {
  const iOwe = waiting.some((m) => m.user_id === meId);
  const others = waiting.filter((m) => m.user_id !== meId);
  const names = others.slice(0, 2).map((m) => (byId[m.user_id] || {}).display_name || "someone");
  const rest = others.length - names.length;
  const othersText = names.length
    ? `Still waiting on ${names.join(", ")}${rest > 0 ? ` and ${rest} more` : ""}.`
    : "";

  if (!waiting.length) return "Everyone has answered.";
  if (iOwe && !others.length) return "Nobody else has answered yet — you're first.";
  if (iOwe) return `You haven't filled this in yet. ${othersText}`;
  return `${responded.size} of ${joined.length} have answered. ${othersText}`;
}

export async function when({ id }) {
  const meId = DB.uid();
  const [rows, members, avail, profiles] = await Promise.all([
    DB.list("hikes", { filter: { id }, limit: 1 }),
    DB.list("hike_members", { filter: { hike_id: id } }),
    DB.list("availability", { filter: { hike_id: id } }),
    DB.list("profiles"),
  ]);

  const h = rows[0];
  if (!h) return el("p", { class: "meta", style: "padding:40px 20px", text: "That hike no longer exists." });

  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const joined = members.filter((m) => m.status !== "left");
  const iAmHost = h.host_id === meId;

  /* the week runs from the proposed date, so the host's suggestion is
     the anchor everyone converges around rather than an arbitrary week */
  const anchor = new Date((h.proposed_date || new Date().toISOString().slice(0, 10)) + "T00:00:00");
  anchor.setDate(anchor.getDate() - 3);
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const hours = [...Array(END_HOUR - START_HOUR + 1)].map((_, i) => START_HOUR + i);

  const mineRow = avail.find((a) => a.user_id === meId);
  let mine = new Set(mineRow ? mineRow.slots : []);

  /* counts from everyone else, so the heatmap shows consensus not you */
  const counts = {};
  avail.forEach((a) => {
    if (a.user_id === meId) return;
    (a.slots || []).forEach((s) => { counts[s] = (counts[s] || 0) + 1; });
  });
  const responded = new Set(avail.map((a) => a.user_id));

  const wrap = el("div");

  /* the same header Location and Gear use — back, the group's faces,
     the screen's name. Calendar was building its own, so one of the
     three planner screens looked like a different app: no avatars, a
     different title style, a different back button. */
  wrap.append(planHeader(h, members, profiles, "When are you free?"));

  /* ---- who has answered ---- */
  const waiting = joined.filter((m) => !responded.has(m.user_id));
  wrap.append(
    el("p", { class: "meta", style: "padding:0 20px 6px" }, [
      el("span", {
        text: waitingText(waiting, responded, joined, byId, meId),
      }),
    ])
  );

  /* ---- the winner, in words ---- */
  const verdict = el("p", { class: "verdict", role: "status" });
  wrap.append(verdict);

  /* ---- the grid ---- */
  const grid = el("div", {
    class: "grid",
    role: "grid",
    "aria-label": "Your availability. Arrow keys to move, space to toggle.",
    style: `--cols:${days.length}`,
  });

  /* header row: day + a whole-column shortcut */
  grid.append(el("div", { class: "grid__corner", "aria-hidden": "true" }));
  days.forEach((d) => {
    grid.append(el("button", {
      class: "grid__day",
      type: "button",
      "aria-label": `Toggle all of ${dayLabel(d)}`,
      onclick: () => toggleDay(d),
    }, [el("span", { text: dayLabel(d) })]));
  });

  const cells = new Map();
  hours.forEach((hr) => {
    grid.append(el("div", { class: "grid__hour", text: hourLabel(hr) }));
    days.forEach((d) => {
      const k = key(d, hr);
      const c = el("button", {
        class: "grid__cell",
        type: "button",
        role: "gridcell",
        "data-k": k,
        "aria-pressed": mine.has(k) ? "true" : "false",
      });
      c.addEventListener("pointerdown", (e) => { e.preventDefault(); startPaint(k); });
      c.addEventListener("pointerenter", () => paintOver(k));
      c.addEventListener("keydown", (e) => onKey(e, d, hr));
      cells.set(k, c);
      grid.append(c);
    });
  });
  wrap.append(grid);

  /* legend — the heatmap is never the only signal, but a legend still
     helps the people who CAN see it */
  wrap.append(
    el("div", { class: "legend" }, [
      el("span", { class: "legend__sw legend__sw--0" }), el("span", { class: "tiny", text: "nobody" }),
      el("span", { class: "legend__sw legend__sw--2" }), el("span", { class: "tiny", text: "some" }),
      el("span", { class: "legend__sw legend__sw--4" }), el("span", { class: "tiny", text: "everyone" }),
      el("span", { class: "legend__sw legend__sw--me" }), el("span", { class: "tiny", text: "you" }),
    ])
  );

  const saveBtn = el("button", {
    class: "btn btn--primary btn--block", type: "button", text: "Save my availability",
    onclick: save,
  });
  wrap.append(el("div", { class: "block" }, [saveBtn]));

  if (iAmHost) {
    wrap.append(el("div", { class: "block" }, [
      el("button", {
        class: "btn btn--ghost btn--block", type: "button",
        text: "Lock in the best time",
        onclick: lockIn,
      }),
      el("p", { class: "tiny", style: "margin-top:8px", text: "Only you can do this — you're hosting." }),
    ]));
  }

  /* ---------------- painting ---------------- */
  let painting = false;
  let paintTo = true;

  function startPaint(k) {
    painting = true;
    paintTo = !mine.has(k);
    apply(k, paintTo);
    window.addEventListener("pointerup", stopPaint, { once: true });
  }
  function paintOver(k) { if (painting) apply(k, paintTo); }
  function stopPaint() { painting = false; refresh(); }

  function apply(k, on) {
    if (on) mine.add(k); else mine.delete(k);
    const c = cells.get(k);
    if (c) { c.setAttribute("aria-pressed", on ? "true" : "false"); style(k, c); }
  }

  function toggleDay(d) {
    const all = hours.every((hr) => mine.has(key(d, hr)));
    hours.forEach((hr) => apply(key(d, hr), !all));
    refresh();
    say(all ? `Cleared ${dayLabel(d)}` : `Marked all of ${dayLabel(d)} free`);
  }

  function onKey(e, d, hr) {
    const di = days.indexOf(d);
    const hi = hours.indexOf(hr);
    let target = null;
    if (e.key === "ArrowRight") target = key(days[Math.min(days.length - 1, di + 1)], hr);
    else if (e.key === "ArrowLeft") target = key(days[Math.max(0, di - 1)], hr);
    else if (e.key === "ArrowDown") target = key(d, hours[Math.min(hours.length - 1, hi + 1)]);
    else if (e.key === "ArrowUp") target = key(d, hours[Math.max(0, hi - 1)]);
    else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      apply(key(d, hr), !mine.has(key(d, hr)));
      refresh();
      return;
    }
    if (target) { e.preventDefault(); cells.get(target)?.focus(); }
  }

  /* ---------------- painting the heat ---------------- */
  function style(k, c) {
    const n = counts[k] || 0;
    const isMine = mine.has(k);
    const total = Math.max(1, joined.length - 1);
    const band = n === 0 ? 0 : Math.min(4, Math.ceil((n / total) * 4));
    c.dataset.heat = String(band);
    c.dataset.mine = isMine ? "1" : "0";
    /* the accessible name carries the count — the colour is a bonus,
       never the message */
    const [d, hh] = k.split(":");
    c.setAttribute("aria-label",
      `${dayLabel(d)} ${hourLabel(Number(hh))}. ${isMine ? "You are free. " : "You are not free. "}` +
      `${n} other${n === 1 ? "" : "s"} free.`);
  }

  function refresh() {
    cells.forEach((c, k) => style(k, c));
    const best = bestSlot();
    verdict.textContent = best
      ? `Best so far: ${dayLabel(best.day)} at ${hourLabel(best.hour)} — ${best.total} of ${joined.length} free.`
      : "Nobody has marked any time yet. Paint the hours you can make.";
  }

  /* ⚠️ This compared the running total against a stored value that was
     only the OTHERS count, so `best.n` was always 0 and every later slot
     with any votes beat it — the "best" time was really just the LAST
     one anyone had ticked. Store the same number you compare. */
  function bestSlot() {
    let best = null;
    days.forEach((d) => hours.forEach((hr) => {
      const k = key(d, hr);
      const total = (counts[k] || 0) + (mine.has(k) ? 1 : 0);
      if (total > 0 && (!best || total > best.total)) {
        best = { k, day: d, hour: hr, total, others: counts[k] || 0 };
      }
    }));
    return best;
  }

  async function save() {
    saveBtn.disabled = true;
    await DB.upsert("availability", { hike_id: h.id, user_id: meId, slots: [...mine] }, ["hike_id", "user_id"]);
    saveBtn.disabled = false;
    toast("Availability saved");
    say(`Saved ${mine.size} time slot${mine.size === 1 ? "" : "s"}.`);
  }

  async function lockIn() {
    const best = bestSlot();
    if (!best) { toast("Nothing to lock in yet"); return; }
    await DB.update("hikes", { id: h.id }, { confirmed_date: best.day });
    await DB.insert("messages", {
      hike_id: h.id, user_id: meId, kind: "system",
      body: `The hike is locked in for ${dayLabel(best.day)} at ${hourLabel(best.hour)}`,
    });
    toast("Locked in");
    say(`Locked in for ${dayLabel(best.day)} at ${hourLabel(best.hour)}.`);
    go(`hike/${h.id}`);
  }

  /* the updated Figma puts the same four tiles on Calendar as on
     Location and Gear — three views of one plan, not three dead ends */
  wrap.append(planTiles(h, "when"));

  refresh();
  return wrap;
}
