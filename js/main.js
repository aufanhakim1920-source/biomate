/* ============================================================
   Biomate — boot

   ⚠️ Registration first, boot LAST. Peak & Pan shipped a bug where a
   screen defined below its own route() call meant a deep link
   rendered the previous screen and only a navigation fixed it —
   invisible to any test that navigates, obvious on a fresh load.
   ES modules make the ordering explicit; the discipline still stands.
   ============================================================ */

import { route, start, go, parseHash } from "./router.js";
import { DB } from "./db.js";
import { el } from "./ui.js";
import { icon } from "./icons.js";
import { loadPrefs } from "./store.js";
import { mount as mountA11y, say } from "./a11y.js";
import { mountAppbar, setAppbarState } from "./appbar.js";
import { consumeAuthRedirect } from "./auth.js";
import { refreshBadge } from "./notify.js";
import { celebrateStreak } from "./fx.js";

import { home } from "./screens/home.js";
import { matchmaker } from "./screens/matchmaker.js";
import { hike } from "./screens/hike.js";
import { messages } from "./screens/messages.js";
import { chat } from "./screens/chat.js";
import { plan, gear } from "./screens/plan.js";
import { location as locationScreen } from "./screens/location.js";
import { when } from "./screens/when.js";
import { profile } from "./screens/profile.js";
import { shelf } from "./screens/shelf.js";
import { trail } from "./screens/trail.js";
import { walk } from "./screens/walk.js";
import { host, region } from "./screens/host.js";
import { onboarding } from "./screens/onboarding.js";
import { account } from "./screens/account.js";
import { person } from "./screens/person.js";
import { notifications } from "./screens/notifications.js";

/* ---------------- routes ---------------- */
route("home",       home,       { title: () => "Home",              nav: "home" });
route("matchmaker", matchmaker, { title: () => "Discover",          nav: "cards" });
route("hike",       hike,       { title: () => "Hike",              nav: "home" });
route("messages",   messages,   { title: () => "Messages",          nav: "chat" });
route("notifications", notifications, { title: () => "What you missed", nav: "chat" });
route("chat",       chat,       { title: () => "Group chat",        nav: "chat" });
route("plan",       plan,       { title: () => "Plan your activity",nav: "chat" });
route("gear",       gear,       { title: () => "Gear",              nav: "chat" });
route("location",   locationScreen, { title: () => "Location",      nav: "chat" });
route("when",       when,       { title: () => "Availability",      nav: "chat" });
route("profile",    profile,    { title: () => "Profile",           nav: "map" });
route("shelf",      shelf,      { title: (p) => p.id || "Shelf",    nav: "map" });
route("trail",      trail,      { title: () => "On trail",          nav: "map" });
route("walk",       walk,       { title: () => "A walk you did",    nav: "map" });
route("host",       host,       { title: () => "Start a group",     nav: "cards" });
route("region",     region,     { title: (p) => p.id || "Region",   nav: "home" });
route("welcome",    onboarding, { title: () => "Welcome",           nav: "" });
route("account",    account,    { title: () => "Your account",      nav: "map" });
route("person",     person,     { title: () => "Profile",           nav: "map" });

/* ---------------- bottom nav ---------------- */
const NAV = [
  { key: "map",    to: "profile",    icon: "map",    label: "You" },
  { key: "home",   to: "home",       icon: "home",   label: "Home" },
  { key: "chat",   to: "messages",   icon: "chat",   label: "Messages" },
  { key: "cards",  to: "matchmaker", icon: "cards",  label: "Discover" },
];

/* ---------------- start a group ----------------
   Hosting was reachable from exactly two places, and both were EMPTY
   STATES: the button appeared when the swipe deck ran out, and when a
   region had nothing in it. So the one action that makes the whole app
   non-empty was only offered once there was nothing left to look at.

   ⚠️ It is a CHILD of the nav, not a free-floating element, and that is
   the whole trick. The nav is two different objects depending on width:
   a fixed pill at the bottom of a phone, and a sticky left rail on a
   desktop. A separately-positioned button has to guess which one it is
   sitting next to, and the first version guessed wrong — pinned to the
   bottom centre while the rail was over on the left. As a child it
   simply inherits whichever the nav currently is:

     phone    absolute inside the fixed pill, right-aligned, floating
              just above it — the layered-edge device from the Scan and
              Go template
     desktop  a normal flex item, ordered first, so it becomes the
              labelled primary action at the top of the rail

   No entrance animation. The template pops it in, but that would fire
   on every navigation, and ambient motion is a hard no here.

   On a phone it is hidden on screens where it would collide with
   something — the chat composer sits in exactly that corner. On a
   desktop rail there is nothing to collide with, and a button that
   appeared and vanished as you navigated would make the rail jump, so
   there it simply stays. */
/* ⚠️ NOT matchmaker. The swipe deck puts its own ✕ / ✓ buttons in
   exactly this corner, and the floating button sat on top of the ✓ —
   the primary action of the whole screen. Discover already reaches
   hosting from its empty state, and the nav is one tap away. */
const CREATE_ON = new Set(["home", "messages"]);
const RAIL = window.matchMedia("(min-width: 900px)");
let fab = null;

function buildFab() {
  fab = el("a", {
    class: "fab",
    href: "#/host",
    "aria-label": "Start a group — post a walk for people to join",
  }, [
    el("span", { class: "fab__ic", html: icon("plus", { size: 20 }), "aria-hidden": "true" }),
    el("span", { class: "fab__t", text: "Start a group" }),
  ]);
  syncFab();
  window.addEventListener("hashchange", syncFab);
  RAIL.addEventListener("change", syncFab);
  return fab;
}

/* `hidden` rather than a CSS class, so it leaves the accessibility tree
   too — a control a screen reader can still reach on a screen where it
   does not apply is worse than no control at all. */
function syncFab() {
  if (!fab) return;
  fab.hidden = !(RAIL.matches || CREATE_ON.has(parseHash().name));
  /* A floating button floats OVER the content, so the last thing on a
     page ends up underneath it and cannot be scrolled clear. Caught by
     looking at a screenshot, not by measuring — every geometry check
     passed while the button sat on top of the missions list. The class
     lets the layout reserve the space, and only while it is showing. */
  document.getElementById("app").classList.toggle("has-fab", !fab.hidden);
}

function buildNav() {
  const nav = el("nav", { class: "nav", "aria-label": "Main" },
    [buildFab()].concat(NAV.map((n) =>
      el("a", {
        class: "nav__item",
        href: `#/${n.to}`,
        "data-nav": n.key,
        "aria-label": n.label,
      }, [
        el("span", { html: icon(n.icon, { size: 26 }), "aria-hidden": "true" }),
        el("span", { class: "sr-only", text: n.label }),
      ])
    ))
  );
  document.getElementById("app").append(nav);
}

/* ---------------- go ---------------- */
async function boot() {
  /* FIRST. The email-confirmation link lands here with the session in
     the URL fragment, and the router would otherwise try to read
     `#access_token=…` as a route name. Swallow it, store the session,
     and rewrite the address bar before anything else looks at it. */
  const redirect = consumeAuthRedirect();
  if (redirect && !redirect.ok) sessionStorage.setItem("biomate/auth-error", redirect.error);
  if (redirect && redirect.ok && redirect.type === "recovery") {
    /* a recovery link signs you in like any other, so without this flag
       the app would land someone on their profile having never asked
       for the new password they came here to set */
    sessionStorage.setItem("biomate/recovery", "1");
  }

  loadPrefs();
  mountA11y();
  mountAppbar();
  buildNav();

  const status = await DB.boot();
  setAppbarState({ status });

  /* the streak moves just by showing up, so it is logged before
     anything else and the bar is drawn as soon as it is known */
  const streak = await DB.touchStreak();
  const stats = await DB.statsFor(DB.uid());
  setAppbarState({ streak, xp: stats.xp || 0 });

  /* A streak is the one reward you earn by doing nothing but turning
     up, so it is the one that has to congratulate you on arrival
     rather than waiting for you to go looking. Guarded to fire once
     per milestone — see celebrateStreak. */
  celebrateStreak(streak);

  /* first run lands in onboarding, not on a home screen full of other
     people's walks with no idea who you are */
  const seen = localStorage.getItem("biomate/onboarded");
  if (!seen && !location.hash) location.hash = "#/welcome/1";

  start();
  say("Biomate ready.");

  /* The inbox count, recomputed on arrival and after every
     navigation. `silent` on the first pass: the count is unknown
     until now, so every item in it is "new" by definition, and a
     page that chimes the moment it finishes loading is precisely
     the ambush the off-by-default rule exists to prevent.

     Hooked to hashchange rather than a timer on purpose — nothing in
     this app polls, so a tab left open overnight does not sit there
     making requests. The trade is that the badge updates when you
     move, not while you sit still, which is the right trade for
     something with no realtime subscription behind it. */
  refreshBadge({ silent: true });
  window.addEventListener("hashchange", () => refreshBadge());
}

boot().catch((err) => {
  console.error("[boot] failed", err);
  const host = document.getElementById("screen");
  if (host) {
    host.innerHTML = `<div class="stack" style="padding-top:60px">
      <h1 class="display">Biomate didn't start</h1>
      <p class="meta">${String(err && err.message || err)}</p>
      <p class="meta">If you opened this file directly, serve it over http instead —
      browsers block JavaScript modules on <code>file://</code>.</p>
    </div>`;
  }
});
