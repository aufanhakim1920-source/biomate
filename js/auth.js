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
  return !s || !s.expires_at || s.expires_at * 1000 - Date.now() < 60_000;
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
      return s;
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
