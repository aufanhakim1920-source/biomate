/* ============================================================
   Biomate — anonymous auth, no SDK

   Why hand-rolled: supabase-js would drag in a dependency and a
   build step for what is ~140 lines of fetch. Everything here is
   plain ES modules over http.

   What this gives us that Peak & Pan did not have: auth.uid().
   That project proved ownership with an `x-device-id` header the
   client set itself — spam-resistant, not tamper-proof. An
   anonymous user is a real row in auth.users with a signed JWT, so
   "only touch your own row" is enforced by Postgres and cannot be
   forged from the console.

   Requires: Supabase dashboard → Authentication → Sign In /
   Providers → Anonymous sign-ins → ON. There is no API for it.
   ============================================================ */

const CFG = window.PP_CONFIG || {};
const KEY = "biomate/session";

/* Boolean(), not the && chain — `a && url && key` returns the KEY as
   its last truthy operand, so anything logging this would print the
   credential. Peak & Pan shipped exactly that bug. */
export const configured = Boolean(CFG.driver === "supabase" && CFG.url && CFG.anonKey);

let session = null;
let inflight = null;
let failed = false;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}
function save(s) {
  session = s;
  if (s) localStorage.setItem(KEY, JSON.stringify(s));
  else localStorage.removeItem(KEY);
}

/* expires_at is unix SECONDS. Refresh a minute early so a request
   started just before the boundary doesn't land just after it. */
function expired(s) {
  /* Number() because expires_at arrives as a string when a session is
     built from the confirmation redirect's URL fragment, and
     "1787360000" * 1000 is fine but ("x" * 1000) is NaN — a NaN
     comparison is false, so a bad value would look permanently
     valid rather than permanently expired. */
  const at = s && Number(s.expires_at);
  return !s || !at || at * 1000 - Date.now() < 60_000;
}

async function call(path, body, opts = {}) {
  const { method = "POST", token = null } = opts;
  const res = await fetch(`${CFG.url}/auth/v1/${path}`, {
    method,
    headers: {
      apikey: CFG.anonKey,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  /* Parse the text and only JSON.parse when non-empty. An empty body
     makes res.json() throw, which in Peak & Pan turned every
     successful write into a silent fallback to local storage. */
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (data && (data.error_description || data.msg || data.message)) || res.status;
    throw new Error(`auth ${path}: ${msg}`);
  }
  return data;
}

async function signInAnonymously() {
  const s = await call("signup", { data: {} });
  if (!s || !s.access_token) throw new Error("auth: anonymous sign-in returned no session");
  save(s);
  return s;
}

async function refresh(s) {
  const next = await call("token?grant_type=refresh_token", { refresh_token: s.refresh_token });
  save(next);
  return next;
}

/** Resolves to a valid session, or null when Supabase isn't configured/reachable. */
export async function ready() {
  if (!configured) return null;
  if (inflight) return inflight;

  inflight = (async () => {
    let s = session || load();
    try {
      if (!s) s = await signInAnonymously();
      else if (expired(s)) {
        try { s = await refresh(s); }
        catch {
          /* A refresh token dies if the project is reset or the user
             deleted. Start a fresh identity rather than leaving the app
             permanently signed out — the old rows are gone either way. */
          save(null);
          s = await signInAnonymously();
        }
      }
      session = s;
      failed = false;
      await hydrate();
      return session;
    } catch (err) {
      /* A silent capability failure reads as a broken build. Record it
         so the UI can say WHY writes are local-only. */
      failed = true;
      console.warn("[auth] anonymous sign-in unavailable —", err.message);
      console.warn("[auth] fix: Supabase dashboard → Authentication → Sign In / Providers → Anonymous sign-ins → ON");
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/* ⚠️ The cached user object goes stale in one direction and it is the
   direction that matters.

   Confirming an email converts the SAME user from anonymous to
   permanent, server-side. The browser that started it is still holding
   the session it was handed at signup, whose `user` says
   `is_anonymous: true` — and access tokens last an hour, so nothing
   forces a refresh. For up to an hour the app keeps calling that person
   a guest, and a reload does not help, because a reload just reads the
   same stale copy back out of localStorage.

   That is exactly what Aufan hit: account made, email confirmed, and
   the app still said guest after refreshing.

   So: ask the server who this token belongs to. Only when the cached
   copy claims to be anonymous, because that is the only claim that can
   silently become wrong — a session that says it is signed in never
   turns out to be a guest. One request, on boot, and only for guests. */
async function hydrate() {
  if (!session || !session.access_token) return;
  const u = session.user;
  if (u && !u.is_anonymous && u.email) return;
  try {
    const fresh = await call("user", undefined, { method: "GET", token: session.access_token });
    if (fresh && fresh.id) {
      session.user = fresh;
      save(session);
    }
  } catch {
    /* offline, or the token was rejected — ready() already deals with
       the failures that matter, and being wrong about guest-ness is
       not worth breaking boot over */
  }
}

/* ------------------------------------------------------------
   The confirmation link comes back with the session in the URL.

   GoTrue verifies the token and then redirects to the site with
   `#access_token=…&refresh_token=…&expires_at=…` in the FRAGMENT.
   Nothing in this app read that, so the new session was dropped on the
   floor — and worse, the router parses `location.hash` as a route, so
   `#access_token=…` resolved to no known screen and fell back to home.

   Must run before the router starts and before ready(), so the arriving
   session wins over the cached one instead of racing it.
   ------------------------------------------------------------ */
export function consumeAuthRedirect() {
  const raw = String(location.hash || "").replace(/^#\/?/, "");
  if (!/^(access_token|refresh_token|error|error_code|error_description)=/.test(raw)) return null;

  const p = new URLSearchParams(raw);
  const clean = (to) => history.replaceState(null, "", location.pathname + location.search + to);

  const err = p.get("error_description") || p.get("error");
  if (err) {
    clean("#/account");
    return { ok: false, error: decodeURIComponent(err).replace(/\+/g, " ") };
  }

  const access_token = p.get("access_token");
  const refresh_token = p.get("refresh_token");
  if (!access_token || !refresh_token) return null;

  save({
    access_token,
    refresh_token,
    token_type: p.get("token_type") || "bearer",
    expires_at: Number(p.get("expires_at")) || Math.floor(Date.now() / 1000) + Number(p.get("expires_in") || 3600),
    user: null,   /* filled in by hydrate() — the fragment carries no user */
  });
  clean("#/account");
  return { ok: true };
}

/** Authorization headers for a PostgREST/Storage call, or {} when signed out. */
export async function headers() {
  const s = await ready();
  if (!s) return {};
  return { apikey: CFG.anonKey, Authorization: `Bearer ${s.access_token}` };
}

/** Force a refresh — called once after a 401 before retrying. */
export async function renew() {
  const s = session || load();
  if (!s) return ready();
  try { return await refresh(s); }
  catch { save(null); return ready(); }
}

export const uid = () => (session && session.user && session.user.id) || "";
export const isAnonymous = () => Boolean(session && session.user && session.user.is_anonymous);
export const hasFailed = () => failed;

/* ============================================================
   Guest → account

   Aufan: "peoplle can join guest mode but make sure there is
   create acc option ok and sign in"

   The important part is that creating an account is an UPGRADE of
   the guest you already are, not a new identity. Supabase converts
   an anonymous user in place, so the user id never changes — every
   hike joined, walk recorded, badge earned and day of streak
   carries over untouched, because every one of those rows is keyed
   on that id. Nothing is migrated because nothing moves.

   ⚠️ Two things this cannot paper over:

   1. This project has email confirmation ON (mailer_autoconfirm is
      false). So creating an account does not finish here — the
      address has to be confirmed from an email. Until then the
      guest session keeps working, which is the right behaviour but
      only if the UI says so instead of claiming success.

   2. SIGNING IN to a different existing account abandons whatever
      the current guest did. Those rows stay owned by an anonymous
      user nobody can sign into again. That is not recoverable, so
      it is warned about before it happens rather than explained
      afterwards.
   ============================================================ */

/** Turn the current guest into a permanent account, same user id. */
export async function createAccount(email, password) {
  const s = await ready();
  if (!s) throw new Error("Not connected — can't create an account right now.");

  const user = await call("user", { email, password }, { method: "PUT", token: s.access_token });

  /* With confirmation on, the address lands in new_email and the user
     stays anonymous until the link is clicked. With autoconfirm on it
     is already email. Read the RESULT rather than assuming either —
     the same code then behaves correctly whichever way the project is
     configured, and the screen can say the true thing. */
  const confirmed = Boolean(user && user.email && !user.new_email);
  if (confirmed && session) {
    session.user = user;
    save(session);
  }
  return { confirmed, pendingEmail: (user && (user.new_email || user.email)) || email };
}

/** Sign in to an existing account. Replaces the current session. */
export async function signIn(email, password) {
  const next = await call("token?grant_type=password", { email, password });
  if (!next || !next.access_token) throw new Error("Sign-in returned no session");
  save(next);
  failed = false;
  return next;
}

/** Sign out, then become a guest again rather than a dead end. */
export async function signOut() {
  const s = session || load();
  if (s && s.access_token) {
    /* best effort — a failed logout must not strand the user in a
       signed-in-but-broken state */
    try { await call("logout", undefined, { token: s.access_token }); } catch { /* ignore */ }
  }
  save(null);
  session = null;
  inflight = null;
  return signInAnonymously();
}

/** Re-send the confirmation mail.

    Converting an anonymous user runs through GoTrue's EMAIL CHANGE
    flow, not the signup flow, because the user already exists — so
    "email_change" is the right type. A project with autoconfirm on
    never gets here, and an account made some other way would be
    "signup", so fall back rather than dead-end on a type mismatch. */
export async function resendConfirmation(email) {
  try {
    return await call("resend", { type: "email_change", email });
  } catch (err) {
    if (!/invalid|type/i.test(String(err.message))) throw err;
    return call("resend", { type: "signup", email });
  }
}

/** What the UI needs to decide what to offer. */
export function account() {
  const u = (session && session.user) || null;
  return {
    signedIn: Boolean(u && !u.is_anonymous && u.email),
    guest: Boolean(!u || u.is_anonymous || !u.email),
    email: (u && (u.email || u.new_email)) || "",
    awaitingConfirmation: Boolean(u && u.new_email && u.new_email !== u.email),
  };
}
