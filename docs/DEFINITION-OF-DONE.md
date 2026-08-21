# Definition of Done — Biomate

**Aufan should not have to ask for any of this.** He said so directly
(2026-08-21): *"remember right to make prd notion, github sharable public, and so
on that i dont tell u here everything you remember."*

This is the standing checklist. It runs when the build is finished, and the
"during" items run continuously — not batched to the end. Most of it is
carried over from [[Peak and Pan]], where each line exists because something went
wrong once.

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

### 3. Netlify → the live link for the presentation

- [ ] Aufan's plan: *"later when presented, ill use netlify for the people i
      presented to can access live."* Static folder, zero build config.
- [ ] **Decide the driver deliberately.** Peak & Pan's public demo ran on the
      *local* driver so his database stayed private. Biomate is different:
      anonymous auth + RLS on `auth.uid()` means the publishable key is safe in a
      public page by design — that is the entire point of the identity change.
      **A social app demoed on local-only storage cannot show a group chat**, so
      the live driver is probably right here. Ask before deploying either way.
- [ ] Verify the deployed URL actually renders, with no console errors, before
      sending it to anyone.

### 4. Vault, last

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
