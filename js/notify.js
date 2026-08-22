/* ============================================================
   Biomate — what happened while you were away

   ⚠️ THERE IS NO NOTIFICATIONS TABLE, and adding one would be the
   wrong shape for this project. Everything below is DERIVED from
   rows that already exist — `messages`, `hike_members`, `hikes` —
   compared against one timestamp in localStorage. Same principle as
   XP and badges: "nothing in the game layer is stored", because a
   stored notification is a second copy of the truth that can drift
   out of sync with the first one, and needs its own RLS policy, its
   own write path, and its own cleanup job.

   The consequences of deriving are all good ones:
     · nothing to backfill — the seeded demo has a populated inbox
       the first time anyone opens it
     · nothing to migrate when a screen changes what it writes
     · "mark as read" is a single number moving forward, so it can
       never be half-applied
     · leaving a group removes its notifications automatically,
       because the membership row they were derived from is gone

   The cost is that "read" is per-device rather than per-account.
   That is the right trade for a demo, and it is the same trade the
   theme and audio settings already make.

   ---- The three things worth interrupting someone for ----------
   1. someone joined a hike YOU host      (hike_members)
   2. new messages in a thread you're in  (messages, grouped)
   3. a hike you joined got a date        (hikes.confirmed_date)

   Deliberately NOT here: your own actions. You do not need telling
   that you sent a message or that you locked in the date yourself.
   ============================================================ */

import { DB } from "./db.js";
import { fmtShortDate } from "./ui.js";
import { play } from "./sound.js";

const SEEN = "biomate/last-seen";

/* First run has no timestamp, and the two obvious defaults are both
   wrong: epoch marks every seeded message unread (a 40-row inbox on
   a brand new install), and `now` marks everything read (an empty
   inbox that makes the feature look broken). A week back is the
   honest answer to "what did I miss?" for someone who has just
   arrived, and it is stable from then on. */
const FIRST_RUN_DAYS = 7;

export function lastSeen() {
  const stored = localStorage.getItem(SEEN);
  if (stored) return stored;
  const start = new Date(Date.now() - FIRST_RUN_DAYS * 864e5).toISOString();
  localStorage.setItem(SEEN, start);
  return start;
}

/**
 * Move the read-marker forward. Never backwards — two screens racing
 * (the list marking one row read while the badge marks all read)
 * must not be able to un-read anything.
 * @param {string} [iso] defaults to now
 */
export function markRead(iso) {
  const next = iso || new Date().toISOString();
  if (next > lastSeen()) localStorage.setItem(SEEN, next);
  return lastSeen();
}

/* ---------------- deriving ---------------- */

const ts = (row) => row.joined_at || row.created_at || "";
const shortTitle = (h) => String((h && h.title) || "A walk").split("—")[0].trim();

/* The date-locking flow in when.js writes a system message alongside
   the confirmed_date. That message is how we date the confirmation
   on a driver whose `hikes` rows carry no updated_at — and it is why
   it must ALSO be filtered out of the message notifications, or the
   same event would be reported twice in two different words. */
const LOCKED_RE = /locked in for/i;

function confirmedAt(hike, systemMsgs) {
  if (!hike.confirmed_date) return null;
  /* the live schema keeps updated_at; the local driver's seed rows
     do not, so fall back rather than assuming either one */
  if (hike.updated_at) return { at: hike.updated_at, by: null };
  const m = systemMsgs.find((x) => x.hike_id === hike.id && LOCKED_RE.test(x.body || ""));
  return m ? { at: m.created_at, by: m.user_id } : null;
}

/**
 * Everything unread, newest first.
 * @returns {Promise<{items:Array,count:number,since:string}>}
 */
export async function feed() {
  const since = lastSeen();
  const meId = DB.uid();

  const [members, hikes, msgs, profiles] = await Promise.all([
    DB.list("hike_members"),
    DB.list("hikes"),
    DB.list("messages"),
    DB.list("profiles"),
  ]);

  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const hikeById = Object.fromEntries(hikes.map((h) => [h.id, h]));
  const nameOf = (id) => (byId[id] || {}).display_name || "Someone";

  /* the groups I am actually in, and the ones I run */
  const mine = new Set(
    members.filter((m) => m.user_id === meId && m.status !== "left").map((m) => m.hike_id)
  );
  const hosted = new Set(hikes.filter((h) => h.host_id === meId).map((h) => h.id));

  const systemMsgs = msgs.filter((m) => m.kind === "system");
  const items = [];

  /* ---- 1. someone joined a hike you host ---- */
  members.forEach((m) => {
    if (!hosted.has(m.hike_id)) return;
    if (m.user_id === meId || m.status === "left") return;
    const at = ts(m);
    if (!at || at <= since) return;
    const h = hikeById[m.hike_id];
    if (!h) return;
    items.push({
      id: `join:${m.hike_id}:${m.user_id}`,
      kind: "join",
      at,
      icon: "people",
      title: `${nameOf(m.user_id)} joined`,
      sub: shortTitle(h),
      to: `hike/${h.id}`,
      spoken: `${nameOf(m.user_id)} joined ${shortTitle(h)}.`,
    });
  });

  /* ---- 2. new messages, one row per thread ----
     Grouped on purpose. Eleven separate rows for one busy group chat
     is not an inbox, it is the chat again — and it would bury the
     single message in the other thread that you actually needed to
     see. */
  const perThread = new Map();
  msgs.forEach((m) => {
    if (m.kind === "system") return;
    if (!mine.has(m.hike_id) || m.user_id === meId) return;
    if (!m.created_at || m.created_at <= since) return;
    const cur = perThread.get(m.hike_id) || { n: 0, last: m };
    cur.n += 1;
    if (m.created_at > cur.last.created_at) cur.last = m;
    perThread.set(m.hike_id, cur);
  });

  perThread.forEach((v, hikeId) => {
    const h = hikeById[hikeId];
    if (!h) return;
    items.push({
      id: `msg:${hikeId}:${v.last.created_at}`,
      kind: "message",
      at: v.last.created_at,
      icon: "chat",
      count: v.n,
      title: shortTitle(h),
      sub: v.n === 1
        ? `${nameOf(v.last.user_id)}: ${v.last.body}`
        : `${v.n} new messages · ${nameOf(v.last.user_id)}: ${v.last.body}`,
      to: `chat/${hikeId}`,
      spoken: `${v.n} new message${v.n === 1 ? "" : "s"} in ${shortTitle(h)}.`,
    });
  });

  /* ---- 3. a hike you're on got its date ---- */
  hikes.forEach((h) => {
    if (!mine.has(h.id)) return;
    const c = confirmedAt(h, systemMsgs);
    if (!c || !c.at || c.at <= since) return;
    /* you locked it in yourself — you were there */
    if (c.by && c.by === meId) return;
    items.push({
      id: `date:${h.id}:${h.confirmed_date}`,
      kind: "confirmed",
      at: c.at,
      icon: "calendar",
      title: "Date confirmed",
      sub: `${shortTitle(h)} · ${fmtShortDate(h.confirmed_date)}`,
      to: `hike/${h.id}`,
      spoken: `${shortTitle(h)} is confirmed for ${fmtShortDate(h.confirmed_date)}.`,
    });
  });

  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  /* A cap, because the list is derived and an account that has been
     away for a month could otherwise render several hundred rows —
     and nobody reads past the first screenful anyway. */
  const capped = items.slice(0, 40);
  return { items: capped, count: items.length, since };
}

/* ---------------- the count badge on the nav ---------------- */

let lastCount = null;

/**
 * Recount and repaint the Messages nav badge.
 *
 * Called on boot and after every navigation — that is what makes it
 * "user-driven" rather than a poller: nothing here runs on a timer,
 * so a page left open does not sit there fetching forever.
 *
 * @param {{silent?:boolean}} [opts] silent skips the arrival cue
 */
export async function refreshBadge(opts = {}) {
  let count = 0;
  try {
    ({ count } = await feed());
  } catch (err) {
    /* An inbox that cannot be built is not a reason to break a
       screen. No badge is a correct-looking answer; a thrown error
       in the middle of boot is not. */
    console.warn("[notify] could not build the feed", err);
    return 0;
  }

  paintBadge(count);

  /* ⚠️ `lastCount === null` is the first count of the session and must
     never make a sound: it fires during boot, before any gesture, and
     "the app made a noise the moment it loaded" is the exact failure
     the off-by-default rule exists to prevent. Only a count that GOES
     UP while you are already here is a new arrival. */
  if (!opts.silent && lastCount !== null && count > lastCount) play("message");
  lastCount = count;
  return count;
}

export function paintBadge(count) {
  const item = document.querySelector('.nav__item[data-nav="chat"]');
  if (!item) return;

  let dot = item.querySelector(".nav__badge");
  if (!count) {
    if (dot) dot.remove();
    item.setAttribute("aria-label", "Messages");
    return;
  }

  if (!dot) {
    dot = document.createElement("span");
    dot.className = "nav__badge";
    /* aria-hidden because the number is already in the nav item's own
       accessible name below — announcing "3" twice, once without any
       noun attached to it, is worse than not announcing it at all */
    dot.setAttribute("aria-hidden", "true");
    item.append(dot);
  }
  dot.textContent = count > 9 ? "9+" : String(count);
  item.setAttribute("aria-label", `Messages, ${count} new`);
}
