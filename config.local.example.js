/* ============================================================
   Copy this file to `config.local.js` and fill it in.
   config.local.js is gitignored and overrides config.js.

   index.html only loads it on localhost, so a deployed build
   never even REQUESTS the file — which avoids a 404 in the
   network tab in front of an audience.
   ============================================================ */

window.PP_CONFIG = {
  driver: "supabase",
  url: "https://<project-ref>.supabase.co",
  anonKey: "<publishable or anon key — NEVER the service_role key>",
};
