# Definition of Done — Biomate

**Aufan should not have to ask for any of this.** He said so directly
(2026-08-21): *"remember right to make prd notion, github sharable public, and so
on that i dont tell u here everything you remember."*

This is the standing checklist. It runs when the build is finished, and the
"during" items run continuously — not batched to the end. Most of it is
carried over from [[Peak and Pan]], where each line exists because something went
wrong once.

---

## ⚠️ The decision this forces, and it is needed BEFORE the first screen

Because the GitHub Pages demo is live *throughout* the build, how keys reach the
browser is settled now, not at deploy time.

**Peak & Pan kept its key off the public demo** — `index.html` only loaded
`config.local.js` when `location.hostname` was localhost, so the hosted page never
even requested it (no 404 in front of judges), and it used `document.write` for
that load because it is synchronous, where an injected `<script>` would race
`db.js`. Consequence, by Aufan's choice: the public demo ran on **local storage
only**.

**That cannot work here.** Biomate is a social app. A group chat, a shared
availability grid, and "number of unique people you hiked with" are all
meaningless on single-browser local storage. **A judge opening the demo would see
an app talking to itself.**

**So: ship the publishable key in the committed `config.js` and let the Pages
demo run live.** This is safe *by design* and is Supabase's documented model —
the publishable key identifies the project and grants nothing; Row Level Security
plus `auth.uid()` is what protects the data. It is only safe because identity was
changed to real anonymous auth; it would **not** have been safe with Peak & Pan's
client-set `device_id` header, which is exactly why that project kept its key
private.

Conditions that make it genuinely safe, all already true or scheduled:
- Every table has RLS on, with write policies checking `user_id = auth.uid()`.
- Storage writes are confined to a folder named after the caller's uid, enforced
  by Postgres.
- The trigger functions have `EXECUTE` revoked from `anon` and `authenticated`,
  so they are not reachable over `/rest/v1/rpc/`.
- **`service_role` never touches a file** — env var only, and only for
  server-side scripts.
- Advisors report zero security lints. Re-run `get_advisors` after every schema
  change, not just once.

⚠️ **A public demo on a live database is a real database.** Anyone can create an
anonymous user and write rows. Before the link goes out: cap what an anonymous
user can insert, and be ready to wipe test data. This is a demo, not a product —
say so if asked.

---

## During the build — not deferred

- [ ] **Vault + memory stay in sync, same turn.** A memory file, its mirrored
      vault note, and a vault git push are one save, not three. A memory that
      exists in only one place is an incomplete save.
- [ ] **Every file edited is mirrored** to `Assets/projects/biomate/` in the same
      turn. Mirror from `git ls-files` so gitignored keys can never be copied in.
      ⚠️ Run git with `-C <repo>` — a mirror loop run from the wrong directory
      once copied 11 unrelated files into this project's mirror.
- [ ] **Every real bug becomes a lesson.** `Claude Second Brain/Biomate/Biomate
      Dev Patterns.md` — Bug (symptom + root cause) → Fix → Rule. Created on the
      first real bug, not before; an empty note is worse than none. If the bug
      reveals a reusable technique, also write a standalone note in
      `Claude Second Brain/Patterns/` with explicit trigger keywords.
- [ ] **Every design decision that came from a reference** gets recorded in the
      relevant Design Template note, including which template it was borrowed
      from and what problem it solved. Three are already assigned: the foil card
      stack, the CSS-3D bookshelf, the draggable focus lens.
- [ ] **Look at it before calling it done.** Screenshot every screen and actually
      read the image. "It compiles", "no console errors" and "the process didn't
      crash" are not verification. Method: [[How to Verify a Web Page You Cannot See]].
- [ ] **Drive it with real events**, not assumptions — swipe a card, send a
      message, record a trail, and assert the database actually changed. Solo
      build means nothing else catches a bad call.
- [ ] **PRD kept current** (see below) — it moves with the code, not after it.

## Shipping — the checklist Aufan shouldn't have to recite

### 1. PRD in Notion

- [ ] Create it via the Notion MCP (`mcp__8b458f2b-*`, authenticated as
      aufanhakim1932@gmail.com). ⚠️ The *other* Notion entry
      (`plugin:productivity:notion`) is unauthenticated and makes Notion look
      unavailable — check the live system, don't trust the plugin list.
- [ ] Written for a judge or a teammate to read, not for me.
- [ ] Sections: problem · users · goals and non-goals · the core loop · scope
      split into **Built vs Not built** · monetisation (or "none", stated
      plainly) · tech and data model · accessibility · risks · links.
- [ ] **§Built vs Not built is the section that goes stale fastest and the one
      judges actually read.** Update it whenever a feature moves between them.
- [ ] **Honesty about AI — two separate statements, both required:**
      - *AI used to build it*: Claude (Anthropic, via Claude Code) wrote most of
        the code, the schema and the RLS policies; the brief, product decisions,
        design direction and Figma are the team's. Say specifically what was
        human-decided — vague "AI-assisted" wording is what gets flagged.
      - *AI inside the product*: **currently none.** The matching is a weighted
        preference-overlap score, not machine learning. **Never call it an "AI
        matching algorithm"** — a judge disproves that in thirty seconds.
- [ ] **State the languages explicitly**: HTML5 · hand-written CSS3 with custom
      properties · vanilla JavaScript as ES modules (no React, no bundler, no npm
      dependencies) · PostgreSQL 17 · PL/pgSQL · PostgREST over `fetch` · SVG ·
      Canvas 2D.
- [ ] Put the PRD URL in the vault note and in this repo's README.

### 2. GitHub → public and shareable

- [ ] **Full secret audit BEFORE flipping — working tree *and* `git log -p --all`.**
      Not just the current files; history is world-readable the moment it's public.
- [ ] Report the audit result to Aufan, then flip in the same turn if clean.
- [ ] `gh repo edit aufanhakim1920-source/biomate --visibility public`
- [ ] Confirm `config.local.js` is untracked and has never been committed.
- [ ] ⚠️ **From that point, anything committed is world-readable**, and a leaked
      key must be **rotated**, not reverted.
- [ ] README current: what it is, how to run it, the live link, the stack.

### 3. GitHub Pages → the live link **during** the build

Aufan, 2026-08-21: *"since we might rn trial and error netlify ill do it after it
is 100 percent finish, for now use github so other can see and judge."*

**GitHub Pages is the demo for the whole build.** It redeploys on every push, so
the link people judge never goes stale, and there is no second place to remember
to update. **Netlify is the final step and Aufan does it himself**, once the app
is finished — do not set it up, do not ask about it before then.

- [ ] ⚠️ **Pages requires a public repo on a free account.** So step 2 and this
      one happen together — there is no private-repo Pages without paying.
- [ ] Enable when there is a **first working screen**, not before. An empty page
      is worse than no link, and the secret audit belongs at the moment of
      flipping, not weeks earlier.
- [ ] `gh api -X POST repos/aufanhakim1920-source/biomate/pages -f source[branch]=main -f source[path]=/`
- [ ] Enforce HTTPS.
- [ ] **Verify the deployed URL actually renders** — load it, read the console,
      screenshot it. A demo link that 404s in front of a judge is worse than not
      sending one.

### 4. Netlify → **last, and Aufan's job**

Only when the app is 100% finished. He will do it. Nothing to prepare beyond
keeping the build a plain static folder, which it already is.

### 5. Vault, last

- [ ] `Claude Second Brain/Coding Claude/Biomate.md` current — status, links,
      what shipped, what didn't.
- [ ] Memory file + `MEMORY.md` pointer current.
- [ ] MOC entry current.
- [ ] Daily note line for the day.
- [ ] Vault committed and pushed.

---

## Aufan's one manual step

**Supabase dashboard → Authentication → Sign In / Providers → Anonymous sign-ins
→ ON.** No API exists for it, so I cannot do it. Verified still off as of
2026-08-21 — signup returns `422 anonymous_provider_disabled`.

## Standing rules that override convenience

- **Nothing gets built until Aufan says `gas`.**
- **No deploying reference-driven learning builds** — but Biomate is a real
  project, not a learning build, so Netlify is expected here.
- **Never write a real secret into a vault note, a memory file, or chat.** Only
  references to where it lives.
- **Motion is user-driven.** Pointer, scroll and touch trigger it; if the visitor
  sits still, the page settles. Everything skipped under `prefers-reduced-motion`.
