# Biomate

A web app by the **team rocket** university group — the same team that built
[Peak & Pan](https://github.com/aufanhakim1920-source/peak-and-pan). New theme,
new project type.

> The brief hasn't landed yet. The backend half that doesn't depend on the
> subject matter is built; the frontend starts when the design does.

## Where things go

```
brief/          ← YOU fill this in: notes, mocks, Figma      (read brief/README.md)
references/     ← design references for this build            (read references/README.md)
docs/           ← decisions, open questions, DEFINITION-OF-DONE.md
supabase/       schema.sql — auth, profiles, media, storage, RLS
screens/        one file per page (empty until the design lands)
assets/         icons, fonts, images
auth.js         anonymous auth over fetch, no SDK
db.js           data layer — one interface, local ⇄ supabase
config.js       committed, ships EMPTY
config.local.js gitignored, holds the real keys (copy the .example)
```

## Running it

No install, no build step. Serve the folder over http and open it:

```bash
npx serve C:\Coding\biomate
```

It works with **no keys at all** — everything runs out of localStorage on the
local driver. Fill in `config.local.js` (copy `config.local.example.js`) to
point it at the real database.

## Decisions

| | | Why |
|---|---|---|
| **Keys** | publishable key **committed**, demo runs live | A social app cannot demo a group chat on local storage. The publishable key grants nothing — RLS on `auth.uid()` is what protects the data. Safe only *because* identity is real auth. Full reasoning in `docs/DEFINITION-OF-DONE.md`. |
| **Identity** | Supabase **anonymous auth** | Peak & Pan proved ownership with an `x-device-id` header the client sets itself — spam-resistant, not tamper-proof. A real `auth.uid()` out of a signed JWT fixes it, with no signup screen, and upgrades to email/Google later on the same uid so nothing has to be migrated. |
| **Stack** | Vanilla HTML/CSS/JS + **ES modules**, no bundler, zero npm dependencies | Every design reference in the library is plain HTML/CSS, so it ports across 1:1 instead of being translated into components. A static folder deploys to Netlify with no build config and cannot fail a build at 2am. ES modules (rather than ordered `<script>` tags) because Peak & Pan lost real time to load-order bugs that explicit imports make impossible. |
| **Solo build** | work on `main` | Aufan and Claude only — no teammates in the repo, so branch-per-screen was dropped as pure overhead. Branch only for something genuinely risky. |
| **Hosting** | **GitHub Pages throughout the build** → Netlify only at 100%, by Aufan | Pages redeploys on every push, so the link people judge is never stale and there is no second place to update. Netlify is the final step and his job — *"we might rn trial and error, ill do it after it is 100 percent finish."* |

## Backend, in one paragraph

Everything runs on the **local driver** out of the box, so a clone works with
no keys and no network. Filling in `config.local.js` flips the same interface
onto real Postgres without a screen file changing. That's not a fallback
nicety — it's what keeps a demo alive when the wifi dies, and what lets a
public link work while the database stays private.

Writes are guarded: if the live database fails, the call falls back to local
**and raises `DB.degraded`**. A fallback that hides failure makes an app look
perfectly healthy while writing nothing to the server — that exact bug cost a
session on Peak & Pan.

## Keys

`config.js` is committed and **ships empty**. Real values go in
`config.local.js`, which is gitignored.

The **publishable/anon key belongs in a browser** — it identifies the project
and grants nothing on its own; RLS plus `auth.uid()` is what protects the data.
The **`service_role` key must never be in any file**: it bypasses RLS entirely
and is only ever read from an environment variable by a server-side script.

Anything committed to a repo is recoverable from history forever. A leaked key
gets **rotated**, not reverted.

## Status

- ✅ Supabase project `biomate` — Sydney, free tier
- ✅ `schema.sql` applied: profiles, media index, storage buckets, RLS
- ⬜ **Anonymous sign-ins must be switched ON by hand** — Supabase dashboard →
  Authentication → Sign In / Providers → Anonymous sign-ins. There is no API
  for it, and nothing auth-related works until it's on.
- ⬜ Domain tables — come with the brief
- ⬜ Frontend — starts on `gas`
