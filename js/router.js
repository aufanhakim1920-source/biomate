/* ============================================================
   Biomate — hash router

   Hash rather than History API on purpose: the app ships to GitHub
   Pages as static files with no server rewrite, so a deep link to
   /hike/abc would 404. `#/hike/abc` always resolves to index.html.

   ⚠️ Screens are registered by import, and boot happens LAST in
   main.js. Peak & Pan shipped a bug where a screen defined below its
   own route() call meant a deep link rendered the *previous* screen
   and only a navigation fixed it — invisible to any test that
   navigates, obvious on a fresh load. ES modules make the ordering
   explicit, but the rule stands: register everything, then boot.
   ============================================================ */

import { set, get } from "./store.js";
import { say } from "./a11y.js";

const routes = new Map();

/**
 * @param {string} name
 * @param {(params: object) => (HTMLElement|Promise<HTMLElement>)} render
 * @param {object} [meta] { title, nav }
 */
export function route(name, render, meta = {}) {
  routes.set(name, { render, meta });
}

export function parseHash() {
  const raw = (location.hash || "#/home").replace(/^#\/?/, "");
  const [name, ...rest] = raw.split("/");
  return { name: name || "home", params: { id: rest[0] || "", sub: rest[1] || "" } };
}

export function go(path) {
  const next = path.startsWith("#") ? path : `#/${path}`;
  if (location.hash === next) render();
  else location.hash = next;
}

export function back() {
  if (history.length > 1) history.back();
  else go("home");
}

let rendering = false;

export async function render() {
  if (rendering) return;

  /* ⚠️ A hash that is not a route must not be treated as one.

     Routes are always written `#/name` — go() prefixes the slash and
     every href in the app does too. But parseHash's leading slash is
     optional, so a plain in-page anchor like `#screen` resolved to a
     route called "screen", found nothing, and fell back to Home.

     That is exactly what the skip link did: the first control a
     keyboard user reaches on every screen threw them back to Home.
     a11y.js now handles that link directly, but this guard is the
     reason it cannot happen again the next time somebody adds an
     ordinary anchor. Ignoring it leaves the current screen alone,
     which is what an in-page anchor should do. */
  const raw = location.hash || "";
  if (raw && !raw.startsWith("#/")) { rendering = false; return; }

  rendering = true;

  const { name, params } = parseHash();
  const entry = routes.get(name) || routes.get("home");
  set({ route: name, params });

  const host = document.getElementById("screen");
  try {
    const node = await entry.render(params);

    /* Give the outgoing screen a chance to clean up before it is
       dropped. Most screens need nothing — but the trail recorder
       holds a GPS watch, a wake lock and an interval, and navigating
       away without releasing them leaves the phone recording (and the
       screen refusing to sleep) for the rest of the session. A
       removed DOM node does not stop any of those on its own. */
    const leaving = host.firstElementChild;
    if (leaving) leaving.dispatchEvent(new CustomEvent("screen:leave"));

    host.replaceChildren(node);
    host.classList.remove("enter");
    /* reflow so the entrance animation restarts on every navigation */
    void host.offsetWidth;
    host.classList.add("enter");

    /* focus management: a screen change must move focus, or a keyboard
       user is left where they were and a screen reader says nothing */
    host.setAttribute("tabindex", "-1");
    host.focus({ preventScroll: true });
    window.scrollTo(0, 0);

    const title = entry.meta.title ? entry.meta.title(params, node) : name;
    document.title = `${title} · Biomate`;
    say(title);
  } catch (err) {
    console.error(`[router] ${name} threw`, err);
    host.replaceChildren(errorScreen(name, err));
  } finally {
    rendering = false;
    syncNav(name, entry.meta.nav);
  }
}

function errorScreen(name, err) {
  const wrap = document.createElement("div");
  wrap.className = "stack";
  wrap.style.paddingTop = "40px";
  wrap.innerHTML = `
    <h1 class="display">That didn't load</h1>
    <p class="meta">The <b>${name}</b> screen hit an error. Nothing is broken elsewhere —
    the rest of the app still works.</p>
    <pre class="tiny" style="white-space:pre-wrap;overflow-x:auto">${String(err && err.message || err)}</pre>
    <a class="btn btn--primary" href="#/home">Back to home</a>`;
  return wrap;
}

/* the nav highlights the *section*, not the exact route, so a hike
   detail page still shows "home" as current */
function syncNav(name, navKey) {
  const key = navKey || name;
  document.querySelectorAll(".nav__item").forEach((a) => {
    const mine = a.dataset.nav === key;
    if (mine) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

export function start() {
  window.addEventListener("hashchange", render);
  render();
}

export { get };
