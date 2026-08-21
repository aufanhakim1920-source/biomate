/* ============================================================
   Biomate — runtime config (COMMITTED, ships empty)

   The app runs entirely on the local driver until this is filled
   in, so a teammate can clone and run with no keys at all.

   To go live:
     1. Run supabase/schema.sql in the project's SQL editor
     2. Turn ON Authentication -> Sign In / Providers -> Anonymous
     3. Fill in url + anonKey below, set driver to "supabase"

   On the publishable key: it BELONGS in a browser. It identifies
   the project, it does not grant anything — Row Level Security
   plus auth.uid() is what actually protects the data. Committing
   it is Supabase's documented design, not a leak.

   NEVER put the service_role key here. That one bypasses RLS
   entirely and must only ever be read from an environment
   variable by a server-side script.

   While the database is private, leave this empty and put the
   real values in config.local.js (gitignored) instead.
   ============================================================ */

window.PP_CONFIG = {
  driver: "supabase",
  url: "https://hworeuvvvwvxcfzgvegh.supabase.co",
  anonKey: "sb_publishable_ygcXMo8nrgBVrCJb8k6oRg_1WUvbKIT",
};
