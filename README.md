# Biomate

**Find people to walk with.** The hike is the excuse; the company is the point.

A hiking-buddy web app: swipe through walks people are hosting near you, join
one, meet the group in a chat, settle a date together, then walk it with the
trail recorder running.

> **Live:** https://aufanhakim1920-source.github.io/biomate/

Built for **Catalyst Ingenium 2026, Track 3 (Forma)** — a product and UX track
where you implement an inherited design blueprint faithfully, improve it where
it is wrong, and defend every change you made.

---

## What it does

**Swipe → join → chat → plan → walk → record.**

- **Discover** — swipe through hikes near you, ranked by who is going, your
  interests, distance and whether the difficulty suits you. The card shows the
  *reason* in words, never a match percentage
- **Group chat** — one thread per hike, members-only, enforced in the database
- **Plan** — three views of one plan: availability, meeting point, gear
- **Availability** — a drag-to-paint grid with an overlap heatmap; the host
  confirms the winning slot
- **Trail recorder** — real device GPS, drawing your route as you walk
- **Your shelf** — walks, photos, people met and badges, as books on a shelf

A light game layer sits on top — levels, missions, badges, streaks — built *out
of* the loop rather than beside it. Every point comes from something you did
with a person, so there is nothing to grind that is not also the thing the app
is for.

## How it is built

Plain HTML, CSS and JavaScript as ES modules. **No framework, no bundler, no
build step, zero npm dependencies at runtime** — the repository is the deployed
artifact. 19 routes across 17 screen modules.

- **PostgreSQL 17** on Supabase, with Row Level Security on every table
- **PostgREST** called over plain `fetch` — no SDK; auth is ~140 lines against
  GoTrue
- **Canvas 2D** for the trail route, **SVG** for icons, the map and generated
  artwork
- **GitHub Pages** for hosting

📖 **[docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md)** explains the whole thing in
plain English — the data layer, where photos go, how the animations work, and
why the game layer is derived rather than stored.

## Running it

No install and no build step. Serve the folder over HTTP and open it:

```bash
npx serve .
```

It runs with **no keys at all** — the local driver keeps everything in
`localStorage` with seeded demo data, so a fresh clone works offline. To point
it at the real database, copy `config.local.example.js` to `config.local.js`
and fill it in.

## Layout

```
index.html              the only page — every screen is built from JavaScript
config.js               committed, ships EMPTY
config.local.example.js copy to config.local.js (gitignored) for real keys
js/                     router, data layer, and the engine modules
js/screens/             one module per screen
css/                    tokens, components, screens, animations
supabase/schema.sql     auth, profiles, media, storage and RLS — the narrative
                        record; full DDL lives in the migration history
test/                   plain Node, no framework
docs/                   how it works, the divergence log, Devpost copy
brief/                  the original brief and clarifications
references/             design references used for this build
```

## Design decisions

| | | Why |
|---|---|---|
| **Identity** | Supabase **anonymous auth** | A real `auth.uid()` from a signed JWT means Postgres can enforce "only touch your own row" from the first tap, with no signup screen. Creating an account converts the same user **in place**, so the id never changes and nothing has to be migrated. |
| **Keys** | publishable key **committed**, demo runs live | A social app cannot demo a group chat on local storage. The publishable key identifies the project and grants nothing — RLS on `auth.uid()` is what protects the data. Safe only *because* identity is real auth. |
| **Stack** | vanilla HTML/CSS/JS, ES modules, no bundler | A prototype that needs a toolchain to run is a prototype that stops working. A static folder cannot fail a build. ES modules rather than ordered `<script>` tags because explicit imports make load-order bugs impossible. |
| **Data layer** | one interface, two drivers | Screens only call `DB.list(...)`; switching between `localStorage` and Postgres changes no screen file. It is what keeps a demo alive when the wifi dies. |
| **Game layer** | derived, never stored | There is no score column anywhere. XP, badges, streaks and notifications are computed from rows that already exist, so nothing can drift out of step with reality or be edited from a browser console. |

## Keys and secrets

`config.js` is committed and **ships empty**. Real values go in
`config.local.js`, which is gitignored.

The **publishable key belongs in a browser** — it identifies the project and
grants nothing on its own. The **`service_role` key must never appear in any
file**: it bypasses RLS entirely and should only ever be read from an
environment variable by a server-side script.

Anything committed to a repository is recoverable from its history forever. A
leaked key gets **rotated**, not reverted.

## Status

Built and deployed.

- ✅ Supabase project, Sydney region — profiles, media index, storage buckets, RLS
- ✅ Domain tables — hikes, membership with leader/co-leader roles, swipes,
  messages, plans, availability, trail logs
- ✅ Guest-first auth, converting to a permanent account in place
- ✅ 19 routes, deployed to GitHub Pages
- ✅ Two test suites — `test/track.test.mjs` (the GPS recorder under load) and
  `test/recommend.test.mjs` (the deck's ranking, and the sentences it prints)

## Documentation

| | |
|---|---|
| [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md) | How the app is put together, in plain English |
| [docs/DIVERGENCE-LOG.md](docs/DIVERGENCE-LOG.md) | What was kept from the blueprint, what changed, and why |
| [docs/DEVPOST.md](docs/DEVPOST.md) | Submission copy |
| [docs/WHO-DID-WHAT.md](docs/WHO-DID-WHAT.md) | How the work was split |
