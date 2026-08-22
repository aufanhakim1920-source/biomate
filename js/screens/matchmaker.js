/* ============================================================
   Biomate — Matchmaker (the swipe deck)

   A card is a HIKE SOMEONE IS HOSTING. The event *is* the group, so
   swiping right is a request to join and it lands you in that hike's
   chat. There are no standing groups.

   ⚠️ Accessibility is not bolted on here, it is half the design.
   A gesture-only deck is unusable with a tremor, a walking pole, or
   no pointer at all. Three equal paths do the same thing:
     · drag the card
     · press the ✕ / ✓ buttons  (these are NOT decoration)
     · left / right arrow keys
   and every card is announced as it reaches the top of the stack.
   ============================================================ */

import { DB } from "../db.js";
import { el, photo, toast, difficultyLabel, fmtShortDate } from "../ui.js";
import { icon } from "../icons.js";
import { say, reducedMotion } from "../a11y.js";
import { get, set, savePrefs } from "../store.js";
import { go } from "../router.js";
import { refreshAppbar, personBadge } from "../appbar.js";
import { xpBurst } from "../fx.js";

/* Cut on a word boundary. A raw slice(0, 130) left "for anyone who'"
   dangling mid-word, which reads as a rendering fault rather than as
   deliberate truncation. */
function clip(text, max = 130) {
  const nl = String.fromCharCode(10);
  const line = (text || "").split(nl).filter(Boolean).slice(-1)[0] || "";
  if (line.length <= max) return line;
  const cut = line.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:]$/, "") + "…";
}

const FILTERS = ["Day hikes", "Backpacking", "Trail running", "Dog friendly", "Camping", "Photography"];

/* commit thresholds — distance OR speed, so a short flick counts */
const DIST_COMMIT = 96;
const VEL_COMMIT = 0.55;   // px per ms

export async function matchmaker() {
  const me = DB.uid();
  const [hikes, swipes, members, profiles, stats] = await Promise.all([
    DB.list("hikes", { filter: { status: "open" } }),
    DB.list("swipes", { filter: { user_id: me } }),
    DB.list("hike_members"),
    DB.list("profiles"),
    DB.allStats(),
  ]);

  const seen = new Set(swipes.map((s) => s.hike_id));
  const mine = new Set(members.filter((m) => m.user_id === me).map((m) => m.hike_id));
  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const active = get().filters;

  let deck = hikes
    .filter((h) => !seen.has(h.id) && !mine.has(h.id) && h.host_id !== me)
    .filter((h) => !active.length || active.some((f) => (h.tags || []).includes(f)));

  const wrap = el("div");

  /* ---- header ---- */
  wrap.append(
    el("div", { class: "topbar" }, [
      el("button", { class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back", html: icon("back", { size: 20 }), onclick: () => go("home") }),
      el("h1", { class: "display", text: "Discover your friends" }),
      el("span", { style: "width:34px" }),
    ])
  );

  /* ---- filter chips ----
     Aufan: "when users select a category, it should move to the front
     of the line... it's not immediately obvious the filter is active".

     The row scrolls sideways, so picking the LAST chip used to leave
     the only evidence of it — a pressed state — parked off-screen. The
     pressed styling was doing its job and nobody could see it.

     So selecting moves a chip to the front, most recent first, and the
     unselected keep their original order behind them. Three details
     make it work rather than merely happen:

       · the same button ELEMENTS are re-ordered, never rebuilt, so a
         FLIP animation can show the movement. Chips that teleport are
         harder to follow than chips that slide, and the whole point is
         that the user notices.
       · focus stays on the chip that was pressed. Reordering under a
         keyboard user without moving focus with them loses their place
         entirely, and this control exists for the person who cannot
         see the pressed state at a glance.
       · the chip is scrolled back into view. Moving it to the front of
         a row that is scrolled right would otherwise make it vanish —
         the exact problem this is meant to fix, inverted. */
  const chips = el("div", { class: "chips", role: "group", "aria-label": "Filter hikes by interest" });

  const chipFor = new Map(
    FILTERS.map((f) => [f, el("button", {
      class: "chip", type: "button", text: f,
      onclick: () => toggleFilter(f),
    })])
  );

  /* selected first — get().filters is kept most-recent-first — then
     everything else in its original order */
  function chipOrder() {
    const on = get().filters.filter((f) => chipFor.has(f));
    return [...on, ...FILTERS.filter((f) => !on.includes(f))];
  }

  function layoutChips(animate) {
    const on = new Set(get().filters);
    const before = animate ? new Map([...chipFor].map(([f, n]) => [f, n.getBoundingClientRect().left])) : null;

    chipOrder().forEach((f) => {
      const n = chipFor.get(f);
      n.setAttribute("aria-pressed", on.has(f) ? "true" : "false");
      chips.append(n);   /* appending a node already in the DOM moves it */
    });

    if (!animate || reducedMotion()) return;
    /* FLIP: the elements are already in their new places, so play the
       old position forward to the new one. One shot, no loop. */
    chipFor.forEach((n, f) => {
      const dx = before.get(f) - n.getBoundingClientRect().left;
      if (Math.abs(dx) < 1) return;
      n.animate(
        [{ transform: `translateX(${dx}px)` }, { transform: "translateX(0)" }],
        { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" }
      );
    });
  }

  function toggleFilter(f) {
    const now = get().filters;
    const isOn = now.includes(f);
    /* [f, ...rest] on select — the newest choice goes to the very
       front, which is what "moves to the front of the line" means */
    set({ filters: isOn ? now.filter((x) => x !== f) : [f, ...now] });
    savePrefs();

    layoutChips(true);

    const n = chipFor.get(f);
    n.focus({ preventScroll: true });
    n.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });

    rebuildDeck();
    paint();

    const count = get().filters.length;
    say(`${f} filter ${isOn ? "off" : "on"}. ${count ? `${count} filter${count === 1 ? "" : "s"} active.` : "No filters."} ${deck.length} hike${deck.length === 1 ? "" : "s"} to look at.`);
  }

  layoutChips(false);
  wrap.append(chips);

  /* Recomputed in place rather than re-rendering the screen: a full
     re-render would drop focus, reset the scroll, and re-fetch
     everything to show the same cards in a different subset. */
  function rebuildDeck() {
    const on = get().filters;
    deck = hikes
      .filter((h) => !seen.has(h.id) && !mine.has(h.id) && h.host_id !== me)
      .filter((h) => !on.length || on.some((f) => (h.tags || []).includes(f)));
  }

  /* ---- the deck ---- */
  const deckEl = el("div", { class: "deck" });
  const live = el("p", { class: "sr-only", "aria-live": "polite" });
  wrap.append(deckEl, live);

  /* the reason the deck is empty changes with the filters, and the
     screen no longer re-renders when they change — so this line is
     updated in paint() rather than baked in once */
  const emptyWhy = el("p", { class: "meta" });
  const empty = el("div", { class: "deck__empty" }, [
    el("div", {}, [
      el("p", { class: "display", style: "font-size:1.4rem;margin-bottom:8px", text: "That's everyone for now" }),
      emptyWhy,
      el("button", { class: "btn btn--primary", style: "margin-top:16px", type: "button", text: "Host a hike", onclick: () => go("host") }),
    ]),
  ]);

  /* ---- actions: the accessible path, and the primary one for most people ---- */
  const actions = el("div", { class: "deck__actions" }, [
    el("button", { class: "deck__act deck__act--no", type: "button", "aria-label": "Not for me", html: icon("close", { size: 28 }), onclick: () => commitTop("left") }),
    el("button", { class: "deck__act deck__act--yes", type: "button", "aria-label": "Ask to join this hike", html: icon("check", { size: 28 }), onclick: () => commitTop("right") }),
  ]);
  wrap.append(actions);

  function paint() {
    deckEl.replaceChildren();
    if (!deck.length) {
      emptyWhy.textContent = get().filters.length
        ? "Try clearing a filter — there may be more outside it."
        : "New hikes appear as people post them. Why not host one?";
      deckEl.append(empty);
      actions.querySelectorAll("button").forEach((b) => (b.disabled = true));
      say("No more hikes to look at.");
      return;
    }
    actions.querySelectorAll("button").forEach((b) => (b.disabled = false));

    /* render back-to-front so the top card is last in the DOM and
       therefore paints above without needing z-index bookkeeping */
    deck.slice(0, 4).reverse().forEach((h, i, arr) => {
      const depth = arr.length - 1 - i;
      deckEl.append(card(h, depth));
    });

    announceTop();
  }

  function announceTop() {
    const h = deck[0];
    if (!h) return;
    const host = byId[h.host_id];
    const text = `${h.title}. Hosted by ${host ? host.display_name : "someone"}. `
      + `${difficultyLabel(h.difficulty)} difficulty, ${h.location_name || h.region}, `
      + `${h.proposed_date ? fmtShortDate(h.proposed_date) : "date to be decided"}. `
      + `Card 1 of ${deck.length}.`;
    live.textContent = text;
    say(text);
  }

  function card(h, depth) {
    const host = byId[h.host_id];
    const face = el("div", { class: "deck__face" }, [
      photo(h.photo_url, `Photo for ${h.title}`, "deck__photo", h.id),
      el("div", { class: "deck__scrim" }, [
        el("span", { class: "deck__name", text: h.title }),
        el("span", { class: "deck__line", html: `${icon("pin", { size: 15 })}<span>${h.location_name || h.region} · ${fmtShortDate(h.proposed_date)}</span>` }),
        el("span", { class: "deck__host" }, [
          el("span", { text: `Hosted by ${host ? host.display_name : "someone"}` }),
          personBadge(stats[h.host_id]),
        ]),
        el("span", { class: "deck__badge", html: `${icon("alert", { size: 13 })}<span>${difficultyLabel(h.difficulty)}</span>` }),
        el("p", { class: "deck__bio", text: clip(h.description) }),
        el("div", { class: "deck__tags" }, (h.tags || []).slice(0, 3).map((t) => el("span", { class: "deck__tag", text: t }))),
      ]),
      el("span", { class: "deck__verdict deck__verdict--yes", text: "JOIN" }),
      el("span", { class: "deck__verdict deck__verdict--nope", text: "NOPE" }),
    ]);

    const c = el("div", {
      class: "deck__card",
      "data-depth": String(depth),
      "data-id": h.id,
      "aria-hidden": depth > 0 ? "true" : "false",
    }, [face]);

    if (depth === 0) {
      c.setAttribute("role", "group");
      c.setAttribute("aria-roledescription", "hike card");
      c.setAttribute("aria-label", `${h.title}, hosted by ${host ? host.display_name : "someone"}`);
      c.tabIndex = 0;
      attachDrag(c, h);
      c.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); commitTop("right"); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); commitTop("left"); }
        else if (e.key === "Enter") { e.preventDefault(); go(`hike/${h.id}`); }
      });
    }
    return c;
  }

  /* ---------------- drag physics ---------------- */
  function attachDrag(node, hike) {
    let startX = 0, startY = 0, dx = 0, dy = 0;
    let lastX = 0, lastT = 0, vx = 0;
    let dragging = false;

    const yes = node.querySelector(".deck__verdict--yes");
    const nope = node.querySelector(".deck__verdict--nope");

    const draw = () => {
      /* rotation proportional to horizontal travel — this is what makes
         it feel like a physical card pivoting under a thumb rather than
         a div sliding */
      const rot = dx * 0.055;
      node.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
      const t = Math.min(1, Math.abs(dx) / DIST_COMMIT);
      yes.style.opacity = dx > 0 ? t : 0;
      nope.style.opacity = dx < 0 ? t : 0;
    };

    node.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      dragging = true;
      node.setPointerCapture(e.pointerId);
      node.style.transition = "none";
      startX = e.clientX; startY = e.clientY;
      lastX = e.clientX; lastT = e.timeStamp;
      dx = dy = vx = 0;
    });

    node.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      dx = e.clientX - startX;
      dy = (e.clientY - startY) * 0.35;      /* damp vertical — this is a
                                                left/right gesture, and free
                                                vertical drift feels broken */
      const dt = e.timeStamp - lastT;
      if (dt > 0) vx = (e.clientX - lastX) / dt;
      lastX = e.clientX; lastT = e.timeStamp;
      draw();
    });

    const release = () => {
      if (!dragging) return;
      dragging = false;
      const committed = Math.abs(dx) > DIST_COMMIT || Math.abs(vx) > VEL_COMMIT;
      if (committed) fly(node, dx >= 0 ? "right" : "left", vx, () => resolve(hike, dx >= 0 ? "right" : "left"));
      else springBack(node, yes, nope);
    };
    node.addEventListener("pointerup", release);
    node.addEventListener("pointercancel", release);
  }

  function springBack(node, yes, nope) {
    node.style.transition = `transform var(--med) var(--ease-spring)`;
    node.style.transform = "";
    if (yes) yes.style.opacity = 0;
    if (nope) nope.style.opacity = 0;
  }

  function fly(node, dir, vx, done) {
    const w = window.innerWidth;
    const to = dir === "right" ? w * 1.2 : -w * 1.2;
    if (reducedMotion()) { node.style.display = "none"; done(); return; }
    /* faster flick → faster exit, floored so a slow drag still leaves
       at a believable speed */
    const ms = Math.max(180, Math.min(420, 320 - Math.abs(vx) * 120));
    node.style.transition = `transform ${ms}ms var(--ease-out), opacity ${ms}ms linear`;
    node.style.transform = `translate(${to}px, ${-40}px) rotate(${dir === "right" ? 22 : -22}deg)`;
    node.style.opacity = "0";
    setTimeout(done, ms - 40);
  }

  function commitTop(dir) {
    const top = deckEl.querySelector('.deck__card[data-depth="0"]');
    const h = deck[0];
    if (!h) return;
    if (top) fly(top, dir, 0, () => resolve(h, dir));
    else resolve(h, dir);
  }

  async function resolve(h, dir) {
    /* ⚠️ `seen` must learn about this too, not just `deck`. Changing a
       filter now rebuilds the deck from `hikes`, and anything only
       removed from `deck` would walk straight back in. */
    seen.add(h.id);
    deck = deck.filter((x) => x.id !== h.id);
    paint();

    await DB.upsert("swipes", { user_id: me, hike_id: h.id, direction: dir }, ["user_id", "hike_id"]);

    if (dir === "right") {
      await DB.upsert("hike_members", { hike_id: h.id, user_id: me, status: "joined" }, ["hike_id", "user_id"]);
      /* 25 for joining + the terrain bonus — the same weights the
         database uses, shown at the moment they are earned */
      const terrain = { easy: 10, moderate: 30, hard: 70 }[h.difficulty] || 0;
      xpBurst(25 + terrain, deckEl);
      refreshAppbar();
      toast(`You're in — ${h.title.split("—")[0].trim()}`);
      say(`Joined ${h.title}. Opening the group chat.`);
      setTimeout(() => go(`chat/${h.id}`), 700);
    } else {
      say("Skipped.");
    }
  }

  paint();
  return wrap;
}
