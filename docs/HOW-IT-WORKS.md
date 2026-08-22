# How Biomate is built

A plain-English tour for Aufan. Not a spec — just what the pieces are and why.

---

## 1. The shape of it

Plain HTML, CSS and JavaScript. No React, no build step, no bundler, zero npm packages at
runtime. `index.html` loads four stylesheets, one Google font, and a single
`<script type="module" src="js/main.js">`. Everything else comes in through ES module
`import`s from there — `main.js` imports the router, the data layer and all 21 screens,
registers the routes, then boots last.

Navigation is **hash-based**: every link is `#/hike/abc`, not `/hike/abc`. That's on
purpose. The app ships to GitHub Pages, which serves static files with no server-side
rewrite, so `/hike/abc` would 404 — there's no `hike` folder on disk. `#/hike/abc` always
resolves to `index.html`, and `js/router.js` reads the hash itself.

The router does the whole job in ~140 lines: parse the hash, run the screen function, swap
the result into `<main>`, move focus into it so a screen reader announces the change. The
outgoing screen gets a `screen:leave` event first — the trail recorder needs it to release
the GPS watch and the wake lock, which a removed DOM node won't do on its own.

## 2. Where the data lives

Supabase (Postgres). But `js/db.js` never touches a Supabase SDK — it defines **one
interface with two drivers**:

- **`local`** — the whole app running out of `localStorage` with seeded demo data. No keys,
  no network.
- **`supabase`** — the same six methods (`list`, `insert`, `upsert`, `update`, `remove`,
  `upload`) written as plain `fetch` calls against PostgREST, Supabase's REST layer.

Screens only ever call `DB.list(...)` and friends, so flipping `PP_CONFIG.driver` moves the
data without a single screen file changing. If a live call fails, the guard falls back to
local — but raises a `DB.degraded` flag, so a dead server can't leave the app looking
healthy while writing nothing.

**Row Level Security** is what actually protects the data. The browser holds a publishable
key that identifies the project and grants nothing; ownership is checked inside Postgres
against `auth.uid()`, which comes from a signed JWT the browser can't forge. "You can only
edit your own row" is a database rule, not a front-end promise. Sign-in is Supabase
anonymous auth, so there's no signup screen.

## 3. Where the pictures are saved

Two steps: shrink in the browser, then upload.

`js/photo.js` decodes the file with `createImageBitmap` (which honours EXIF rotation) and
redraws it on a canvas scaled so the **longest edge is 1600px**, re-encoded as **JPEG at
quality 0.82**. Anything over 25 MB is refused outright. A phone photo is 3–6 MB and
4000px wide; the widest we ever draw it is about 800px, so the original would spend
someone's mobile data on pixels no screen will show. Resized it lands around 200–400 KB,
and the picker says so.

That blob goes to **Supabase Storage**, into the `uploads` bucket at
`uploads/<your-user-id>/<timestamp>-group-<hike-id>.jpg`. The folder name isn't a
convention — the storage policy checks the first path segment *is* your own uid, so
Postgres rejects anything else. The upload returns a public URL, and only that **URL
string** is written to the database (`hikes.photo_url`, or your avatar). The bytes never go
in a table.

Offline there's no bucket, so the local driver returns a `data:` URL instead — the caller
still gets something it can put in an `src`, and nothing has to branch.

## 4. The animations

The rule across the app: **motion happens because you did something, and it stops.**

**Screen entrance** — pure CSS. A `rise` keyframe (10px up, fade in) over 260ms on the
first six children with a 40ms stagger, so a page assembles rather than appearing.

**The swipe deck** (`js/screens/matchmaker.js`) is the only real physics, hand-written on
pointer events. While you drag, JS writes the transform directly: horizontal travel,
damped vertical travel (×0.35 — it's a left/right gesture), and a rotation of
`dx × 0.055` degrees, which is what makes it feel like a card pivoting under a thumb
rather than a div sliding. The JOIN/NOPE stamps fade in proportionally. On release it
commits on **distance OR speed** — past 96px, *or* a flick faster than 0.55 px/ms — so a
quick flick counts even if it barely moved. A committed card flies off in 180–420ms,
faster the harder you flicked; an uncommitted one springs back on a CSS transition with a
slight overshoot. The ✕ / ✓ buttons and the arrow keys do exactly the same thing.

**Filter chips** use FLIP. Selecting a chip moves it to the front of the row so the active
filter can't sit off-screen. The chip *elements* are re-ordered, not rebuilt: measure where
each one is, move them, measure again, then play each from its old position to its new one
with the Web Animations API over 260ms. This is the only `.animate()` call in the codebase.

**Celebrations** (`js/fx.js`) are two things: the `+25 XP` chip that flies from where you
earned it up to the level chip (CSS keyframe, 1.2s, with the chip doing a 0.45s spring
bump as it lands), and "the moment" — one panel used for all five occasions (joined,
badge, level-up, walk saved, streak), queued in a stack so two can't land on the same 30
pixels. There's deliberately **no confetti**: density is what causes the nausea, so every
effect is one element on one path.

**CSS vs JS:** CSS owns anything with a fixed start and end — hover and press states,
entrances, the XP bar growing — about 15 transition declarations in total, nearly all on a
140ms token. JS owns the two things a stylesheet can't know: the drag transform and the
FLIP measurement.

**Reduced motion.** `css/base.css` crushes every animation to 0.01ms under
`prefers-reduced-motion: reduce`, and the JS checks `matchMedia` itself — card physics,
chip FLIP, smooth scroll and the XP chip all skip. It's *reduced*, not removed: the
celebration panel still appears, just still, and stays 35% longer to make up for having no
entrance. Otherwise a reduced-motion visitor would be the only person who couldn't see
they'd levelled up. There is exactly **one** loop in the app — the GPS dot pulsing while
it waits for a fix — and it stops the moment a fix lands.

## 5. The drawing

No mapping library, almost no image files. `js/routemap.js` draws a walk on **two stacked
canvases**: the route line is only ever added to, and the moving dot lives on a second
canvas on top that's the only thing cleared each frame — otherwise the dot smears stale
copies down the route. A full redraw only happens when a point falls outside the view, and
each redraw inflates the view 18% past the data, so redraws get rarer as the walk grows.
`js/ausmap.js` is a hand-built SVG Australia with state-name pills, doubling as the
collection board. `js/art.js` generates a deterministic SVG landscape from a hash of each
hike's id, so a hike with no photo gets its own ridgelines instead of a broken image.

## 6. The clever bit worth knowing

**XP, levels, badges, streaks and notifications are derived, not stored.** There is no
score column. XP is recomputed in Postgres from rows that already exist — 25 for joining,
60 for hosting, 10/30/70 for terrain, 5 per message capped at 150, 1 per 100m walked — and
the app only ever reads it back through a view. Badges are computed in the browser from the
same counts, and there's no notifications table either: the inbox is `messages`,
`hike_members` and `hikes` compared against one "last seen" timestamp.

Why it matters: a stored number is a second copy of the truth, and second copies drift.
Nothing can be granted by editing a request in the console, nothing needs backfilling when
a screen changes what it writes, and leaving a group removes its notifications
automatically — because the row they came from is gone.
