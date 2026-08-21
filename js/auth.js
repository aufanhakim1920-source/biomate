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

async function call(path, body) {
  const res = await fetch(`${CFG.url}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: CFG.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
