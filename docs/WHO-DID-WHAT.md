# Who did what

Written for Aufan, and honest enough to hand to a judge.

---

## First, a correction about the commit log

The commits used to carry `Co-Authored-By: Claude` trailers. **They were
applied inconsistently** — 46 of 58 commits had one, and the 12 without were
not human-only work, they were simply commits where the trailer was not added.

So the commit log cannot be used to split this project into "your part" and
"the AI's part", and this document does not pretend otherwise. Anyone who tried
would conclude that the twelve most recent features were hand-written by a
person, which is false.

The honest split is not by commit. It is by **kind of work**.

---

## The short version

**Claude wrote essentially all of the code.** 17 screens, 24 engine modules,
the CSS, the database schema and the security policies — roughly 11,400 lines
across the working tree.

**You decided what it should be, and caught what was wrong with it.** That is
not a smaller contribution; it is a different one, and it is the one the
Catalyst track is actually scored on. Track 3 asks you to implement a blueprint
faithfully, improve it where it is wrong, and defend every change. Every single
one of those judgements was yours.

---

## Your part, specifically

These are things that came from you and would not exist otherwise. Each one is
traceable to a moment you asked for it or pushed back.

### Features that exist because you asked for them

| You said | What it became |
|---|---|
| "is it possible to have like Strava type of thing… but ofc these line cant be like overlap it will crash if too much" | The whole GPS trail recorder — **and its central design constraint**. See below; this one deserves its own section. |
| "there is feature to leave group chat" | Leave-group, with the system message posted *before* the status flip (a member cannot post to a hike they have already left) |
| "so people can join guest mode but make sure there is create acc option ok and sign in" | Guest-first auth, and the decision that an account is an upgrade rather than a gate |
| "add forgot password too" | Password recovery, including handling the emailed recovery link |
| "add recomendation search" | The ranked deck and the search box — the PRD had been *claiming* a weighted score that did not exist |
| "let's add notification, sound effect and popups" | The notification centre and five sound cues, off by default |
| "the one can edit the group only for the leader right? there should be like leader, co leader" | Roles, enforced in Postgres rather than in the UI |
| "u should be able to do the profile picture from any photo upload too" | Browser-side image resizing and upload for your own avatar |
| "remove the photo scan remove it straight" | Photoscan cut — along with the mission, badge and XP term that depended on it |

### Times you caught something that was actually broken

These matter more than the feature requests, because each one was a real defect
that had been missed:

- **"where is this path thing btw"** — the trail recorder was fully built,
  tested and deployed, and *nothing in the app linked to it*. It was reachable
  only by typing the URL. This is now written up in the Devpost as the lesson
  that a registered route is plumbing, not delivery.
- **"my friend tried to make account but the confirmation email kinda broken
  they stucked and error 404"** — Supabase's Site URL was still pointing at
  `localhost:3000`, so every confirmation link sent to a real person 404'd.
  Found because you had actual humans testing it.
- **"i just want them to use the same email again to sign in can u fix"** —
  after you deleted test accounts, you spotted that the emails needed to be
  genuinely free again.
- **"is that mean github basically netlify"**, **"why 6 running in the
  background"** — both times you questioned something that looked off, and both
  times there was something to find.
- **"i tried u sure we can change pfp"** — the profile photo upload had been
  built but never committed. You were looking at a version that did not have
  it, and said so.
- **"the sound effect setting default is on"** — worth chasing down; it turned
  out to be correct behaviour (you had switched it on and the app remembered),
  but it was the right question to ask.

### The single best call you made

> *"but ofc these line cant be like overlap it will crash if too much"*

You said this before a line of the recorder existed, and **you were right in a
way that is measurable**. `watchPosition` fires roughly once a second, so a
four-hour walk is ~14,000 fixes. `Math.min(...points)` genuinely throws a
`RangeError` past about 100,000 arguments — a real crash, not a slow path.

That one sentence is why the recorder has three gates and an *iterative*
Douglas–Peucker simplifier instead of a naive line. Measured afterwards:

| | |
|---|---|
| 50,000 fixes fed in | 851 points held in memory |
| Saved to the database | 4 KB for 151 points |
| 200,000-point simplify | 496 points in 37 ms, no overflow |
| Worst deviation from the drawn line | 5.99 m against a 6 m tolerance |
| Distance after simplification | unchanged, to the metre |

A prediction that specific, made that early, is design work. It is the clearest
single example of you doing the part of this project that cannot be automated.

### Product judgement that shaped the whole thing

- **"i meant update not really rework everything"** — stopping scope creep.
- **The brief's own thesis**, that social cohesion is the point and hiking is
  the occasion, is the line that settled the biggest architectural argument:
  a card is a hike someone is hosting, not a person. That removed an entire
  database table.
- **Motion must be user-driven.** Ambient full-screen motion makes you
  nauseous, so nothing in this app loops or drifts on its own. That is a
  constraint from you that turned into an accessibility feature.
- **The design direction and the Figma** are the team's work, not Claude's.
- **The divergence log** is where your decisions are recorded, and it is worth
  16 of the track's 25 points.

---

## Claude's part, specifically

Stated plainly so nobody has to guess:

- All 17 screens and 24 engine modules — routing, the data layer, the swipe
  deck, the availability grid, the trail recorder, the canvas drawing, the
  derived XP and badge system
- The PostgreSQL schema, the Row Level Security policies, and the migrations
- The CSS, including the contrast measurement and the accessibility work
- Both test suites
- The documentation in `docs/`, including the divergence log and the Devpost
  copy — **written from your decisions, not instead of them**

---

## What this means for the submission

The Devpost entry states this openly, and it should stay that way. The reason
is not just honesty: **the work that wins Track 3 is the work you did.** The
rubric rewards faithful implementation, defensible divergence, and a record of
why. A judge who reads the divergence log is reading your calls.

If anyone asks what you contributed, the answer is not "I prompted an AI". It
is that you set the brief, made every product decision, predicted the one
failure that would have broken the headline feature, found the bugs that real
testing surfaces, and cut a feature rather than ship one that lied about
itself.
