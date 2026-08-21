/* ============================================================
   Biomate — boot

   ⚠️ Registration first, boot LAST. Peak & Pan shipped a bug where a
   screen defined below its own route() call meant a deep link
   rendered the previous screen and only a navigation fixed it —
   invisible to any test that navigates, obvious on a fresh load.
   ES modules make the ordering explicit; the discipline still stands.
   ============================================================ */

import { route, start, go } from "./router.js";
import { DB } from "./db.js";
import { el } from "./ui.js";
import { icon } from "./icons.js";
import { loadPrefs } from "./store.js";
import { mount as mountA11y, say } from "./a11y.js";
import { mountAppbar, setAppbarState } from "./appbar.js";
import { consumeAuthRedirect } from "./auth.js";

import { home } from "./screens/home.js";
import { matchmaker } from "./screens/matchmaker.js";
import { hike } from "./screens/hike.js";
import { messages } from "./screens/messages.js";
import { chat } from "./screens/chat.js";
import { plan, gear } from "./screens/plan.js";
import { when } from "./screens/when.js";
import { profile } from "./screens/profile.js";
import { shelf } from "./screens/shelf.js";
import { photoscan } from "./screens/photoscan.js";
import { trail } from "./screens/trail.js";
import { walk } from "./screens/walk.js";
import { host, region } from "./screens/host.js";
import { onboarding } from "./screens/onboarding.js";
import { settings } from "./screens/settings.js";
import { account } from "./screens/account.js";
import { person } from "./screens/person.js";

/* ---------------- routes ---------------- */
route("home",       home,       { title: () => "Home",              nav: "home" });
route("matchmaker", matchmaker, { title: () => "Discover",          nav: "cards" });
route("hike",       hike,       { title: () => "Hike",              nav: "home" });
route("messages",   messages,   { title: () => "Messages",          nav: "chat" });
route("chat",       chat,       { title: () => "Group chat",        nav: "chat" });
route("plan",       plan,       { title: () => "Plan your activity",nav: "chat" });
route("gear",       gear,       { title: () => "What to bring",     nav: "chat" });
route("when",       when,       { title: () => "Availability",      nav: "chat" });
route("profile",    profile,    { title: () => "Profile",           nav: "map" });
route("shelf",      shelf,      { title: (p) => p.id || "Shelf",    nav: "map" });
route("photoscan",  photoscan,  { title: () => "Photoscan",         nav: "camera" });
route("trail",      trail,      { title: () => "On trail",          nav: "map" });
route("walk",       walk,       { title: () => "A walk you did",    nav: "map" });
route("host",       host,       { title: () => "Host a hike",       nav: "cards" });
route("region",     region,     { title: (p) => p.id || "Region",   nav: "home" });
route("welcome",    onboarding, { title: () => "Welcome",           nav: "" });
route("settings",   settings,   { title: () => "Settings",          nav: "map" });
route("account",    account,    { title: () => "Your account",      nav: "map" });
route("person",     person,     { title: () => "Profile",           nav: "map" });

/* ---------------- bottom nav ---------------- */
const NAV = [
  { key: "map",    to: "profile",    icon: "map",    label: "You" },
  { key: "camera", to: "photoscan",  icon: "camera", label: "Photoscan" },
  { key: "home",   to: "home",       icon: "home",   label: "Home" },
  { key: "chat",   to: "messages",   icon: "chat",   label: "Messages" },
  { key: "cards",  to: "matchmaker", icon: "cards",  label: "Discover" },
];

function buildNav() {
  const nav = el("nav", { class: "nav", "aria-label": "Main" },
    NAV.map((n) =>
      el("a", {
        class: "nav__item",
        href: `#/${n.to}`,
        "data-nav": n.key,
        "aria-label": n.label,
      }, [
        el("span", { html: icon(n.icon, { size: 26 }), "aria-hidden": "true" }),
        el("span", { class: "sr-only", text: n.label }),
      ])
    )
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

  /* first run lands in onboarding, not on a home screen full of other
     people's walks with no idea who you are */
  const seen = localStorage.getItem("biomate/onboarded");
  if (!seen && !location.hash) location.hash = "#/welcome/1";

  start();
  say("Biomate ready.");
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
