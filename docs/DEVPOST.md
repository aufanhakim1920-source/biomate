# Devpost copy — Biomate

Paste-ready. Devpost's standard headings are used so it drops straight in.
**Two things must be filled in before submitting** — they are marked ⚠️.

---

## Tagline

**Find people to walk with. The hike is the excuse; the company is the point.**

---

## Blueprint attribution

> **Built from the Biomate blueprint by the Product-thon team _Fantastic Four_.**
> Their design gave this product its shape — the watercolour Australia, the
> shelf, the card stack, and the idea that the people are the point.

---

## Inspiration

The barrier to getting outdoors isn't finding a trail. AllTrails solved that a
decade ago. The barrier is finding **people to walk it with** — especially if
you're new to a city, new to hiking, or both.

Every outdoors app we looked at treats the trail as the product and other
people as metadata. Biomate inverts that. The blueprint we inherited had the
same instinct, and the sentence we kept coming back to was in the brief:
**social cohesion is the point, hiking is the occasion.**

That one line settled a surprising number of arguments later.

---

## What it does

**Swipe → join → chat → plan → walk → record.**

The key decision, and the first place we diverged: **a card is a hike someone
is hosting, not a person.** The brief said you swipe on "hiking groups"; the
Figma card showed a face. Making the card an *event* satisfies both — the event
*is* the group. It removed an entire database table, deleted the "what is this
group for between hikes" problem, and made "how many people have you hiked
with" fall straight out of co-membership.

- **Discover** — swipe through hikes near you, filtered by what you're into
- **Group chat** — one thread per hike, members-only, enforced in the database
- **Plan** — three views of one plan: availability, location, gear
- **Availability** — LettuceMeet-style drag-to-paint grid with an overlap
  heatmap; the host locks in the winning slot
- **Trail recorder** — real device GPS, drawing your route as you walk
- **Your shelf** — walks, photos, people met, badges, as books on a shelf

On top sits a light game layer — levels, daily missions, badges, login
streaks — deliberately built *out of* the loop rather than beside it. Every
point comes from something you did with a person. **There's nothing to grind
that isn't also the thing the app is for.**

---

## How we built it

**Vanilla HTML, CSS and JavaScript. No framework, no bundler, no build step,
zero npm dependencies at runtime.** It ships as a static folder.

That was a choice, not a shortcut. A hackathon prototype that needs a toolchain
to run is a prototype that stops working. This one opens.

- **HTML5 / CSS3** — hand-written, custom properties for design tokens. No
  Tailwind, no Bootstrap, no preprocessor
- **JavaScript (ES2020+) as ES modules** — no React, no Vue, no bundler
- **PostgreSQL 17** with Row Level Security on every table
- **PL/pgSQL** for the derived-stats functions
- **PostgREST** — Supabase's REST layer, called over `fetch`. No SDK; auth is
  ~140 lines of `fetch` against GoTrue
- **Canvas 2D** for the trail route, **SVG** for icons and generated artwork
- **Supabase** (Postgres, Auth, Storage) · **GitHub Pages** (hosting)

### Two architectural decisions we'd defend hardest

**1. Nothing in the game layer is stored.** XP, badges, missions and streaks
are *derived* from rows that already exist. There is no score column anywhere,
so nothing can drift out of step with reality or be edited from the browser
console. A badge cannot be wrong: if the app says you walked in four states,
four rows say so.

**2. Guest first; an account is an upgrade, not a gate.** A real anonymous auth
user is created on first visit — a genuine row with a signed token, which is
what lets Postgres enforce "only touch your own row" from the first tap.
Creating an account **converts that same user in place**, so the id never
changes and every hike, walk, badge and streak day carries over. There's no
migration because nothing moves — and that only works *because* guest came
first.

---

## Challenges we ran into

**The trail recorder would have fallen over on a real walk.** A teammate asked
whether the line would "crash if too much", and he was right. `watchPosition`
fires about once a second, so a four-hour walk is ~14,000 fixes — and
`Math.min(...points)` genuinely throws `RangeError` past ~100k arguments, while
redrawing the whole canvas per fix is quadratic over the walk.

The fix is three gates and a simplifier: drop fixes the device admits are
vague, drop teleports, and ignore anything within 8 m of the last point — that
last one is what stops three minutes at a lookout becoming a scribble. What
survives is thinned with an **iterative** Douglas–Peucker (the textbook
recursive form overflows the stack on exactly the tracks it exists for).

Measured, in a plain Node test with no framework:

| | |
|---|---|
| 50,000 fixes fed in | 851 points held in memory |
| Saved to the database | **4 KB** for 151 points |
| 200,000-point simplify | 496 points in 37 ms, no overflow |
| Worst deviation from the drawn line | **5.99 m** against a 6 m tolerance |
| Distance after simplification | **unchanged, to the metre** |

That last row is the one that matters: distance accumulates *before*
simplification, because tidying the line must never quietly shorten someone's
walk.

**Contrast failures that a glance would never catch.** A static audit of every
colour pair found `--on-brand` was pure white and never redefined for dark
mode — while the dark brand fill is lifted to stay legible on a dark ground.
White on it measured **3.40:1** against a 4.5 bar. Because that one token
carries every primary button, the swipe deck's confirm, the active nav item,
tiles and checkboxes, **dark mode was failing all of them at once**. Same
story for the body-text token at 2.66:1. One token change each, measured
after: 4.88:1 and 5.50:1.

**A skip link that skipped nowhere.** `<a href="#screen">Skip to content</a>` —
textbook markup. But this app is hash-routed, so `#screen` parsed as a route
named "screen", found nothing, and fell back to Home. **The first control a
keyboard user reaches on every screen threw them back to Home.**

---

## Accomplishments that we're proud of

**The app tells the truth about itself.** Where something doesn't work, it says
so in plain words rather than hiding it:

- The Location screen has **no street map**, and explains that tiles would mean
  sending every visitor's IP to a third party — which this app, with zero
  third-party requests and no trackers, wasn't willing to do quietly
- The trail recorder tells you a browser **cannot record with the screen off**,
  and when it happens the line **breaks** rather than drawing a straight guess
  across ground you may not have walked
- Climb reads **"not measured"** rather than a confident `0 m`, because most
  phones have no barometer
- **There is no AI in this product**, and we say exactly that

That last one cost us a feature. Photoscan — point your camera at a plant to
identify it — was in the blueprint, and we built the screen, the camera flow
and the history. What we couldn't build was the identification, which needs a
vision model behind a server-side key. Rather than ship a feature whose own
screen explained why its headline claim didn't work, **we removed it** — along
with the daily mission that could never be completed, the badge that could
never be earned, and the XP term that would have stopped the arithmetic on
screen from adding up.

**Accessibility as design, not compliance.** The swipe deck is fully operable
without swiping — a gesture-only deck is unusable with a tremor or one free
hand. The availability grid has a real keyboard path, because tabbing 105 cells
is technically accessible and practically cruel. And `lang="woi"` on
**Womindjeka!** so a screen reader doesn't run an acknowledgement of Country
through English phonics.

---

## What we learned

**A registered route is plumbing, not delivery.** The trail recorder shipped
complete — built, tested, deployed — and *nothing in the app linked to it*. It
was reachable only by typing the URL. Hosting a hike had the same shape: two
links, both inside empty states, so the one action that makes the app non-empty
was only offered once there was nothing left to look at. Both were found by a
teammate asking "where is it?", which is the worst way to find out.

**Deleting a feature isn't deleting a screen.** In a system where every number
is derived, a removed feature leaves a mission nobody can complete and a badge
nobody can earn.

**A design's node names lie; the pixels don't.** One Figma frame named
"Location" was actually the Gear screen. We screenshot every frame before
building it — a habit from a previous project where three screens were built
from node names alone and all three were wrong.

**"It compiles" is not verification.** `node --check` passed a file that
declared the same variable twice in one scope; the browser refused the entire
module graph and the app booted blank.

---

## What's next

- **Recommendations over a flat filter** — scoring hikes on who's going, your
  interests, proximity and difficulty fit, with the *reason* surfaced rather
  than a percentage
- **GPX import and export**, so a planned route can come in and a walked one
  can go out
- **A real join request flow** — right now a right swipe joins immediately; the
  schema already models `requested`
- **Reporting and verification.** We meet strangers from the internet and do
  neither. A real product needs both, and we'd rather name that than let it
  pass unmentioned

---

## Built With

```
javascript · html5 · css3 · supabase · postgresql · postgrest · plpgsql
canvas · svg · web-audio · geolocation · github-pages · figma · claude
```

---

## Try it out

- **Live:** https://aufanhakim1920-source.github.io/biomate/
- **Code:** https://github.com/aufanhakim1920-source/biomate
- **Divergence log:** [`docs/DIVERGENCE-LOG.md`](DIVERGENCE-LOG.md) — what we
  kept from the blueprint, what we changed, and why
- **⚠️ Video pitch:** TO RECORD — required by the track

---

## A note on how this was built

Claude (Anthropic) wrote most of the application code, the database schema and
the security policies, working from our brief and our review. The team decided
the problem, the product, the design direction, and made every scope call in
the divergence log — including the decision to cut a feature rather than fake
it. Every commit is authored by a team member; the AI collaboration is recorded
in the commit trailers and stated here rather than left to be discovered.
