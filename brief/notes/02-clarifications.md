# Clarifications

Running log of things Aufan told me in chat that are **not** in the written brief
(`01-project-overview.md`). Newest at the bottom. These carry the same weight as
the brief — they usually exist because I got something wrong or asked.

---

## 2026-08-21 — The swipe card is a group photo

> *"for the swipe thingy is just like the group photo their favorite photo
> together bassically understand?"*

**The face of a swipe card is one photograph of the group together — their
favourite photo of themselves as a group.** Not a grid of member avatars, not a
trail photo, not a stack of individual profile pictures.

Why this matters more than it sounds:

- **It is the entire pitch of the app in one image.** You are not choosing a
  hike, you are choosing *these people*. A card showing a mountain would sell a
  trail; a card showing five people laughing sells company. The brief says the
  app "prioritizes the social feature first" — this is that sentence rendered as
  a UI decision.
- **It settles the card layout.** One full-bleed photo, edge to edge, with the
  group name and the matching detail overlaid on a gradient scrim at the bottom.
  The Tinder shape, and correct: a photo that is cropped into a corner while
  metadata takes the rest of the card reads as a listing, not a person.
- **It creates a real empty state.** A brand-new group has no favourite photo
  yet. That needs a designed answer — an illustrated placeholder in the group's
  own colour, not a broken image icon and not a stock mountain. **Handle it from
  the start**; on Peak & Pan the rule that saved several screens was that a
  missing image falls back to something drawn, so absent artwork can never break
  a screen.
- **Storage is already built for it.** The `uploads` bucket takes files into a
  folder named after the uploader's `auth.uid()`, enforced by Postgres. The
  group's chosen photo is a `photo_url` on the group row pointing at it.

**Open, minor:** who picks the favourite photo — whoever created the group, or a
group vote? Assuming the creator until told otherwise.

---

## 2026-08-21 — It is a solo build

> *"don't worry about anybody edit it individually or stuff, we od it alone ok"*

**No teammates working in the repo. Aufan and me.**

What this cancels:

- **Branch per screen is dropped.** That existed purely so two people never
  opened the same file on a deadline. With nobody else committing it is pure
  overhead — work on `main`, branch only for something genuinely risky.
- **No `CONTRIBUTING.md`, no collaborator invites.** The repo stays private and
  stays a one-person repo.
- **File structure follows logic, not ownership.** Peak & Pan was split one file
  per page because *he asked for it, for the team*. Here, files get split when a
  file gets hard to read — which is a better reason and usually a different
  split.

What it does **not** change:

- **Still vanilla, still no build step.** The team-install argument is gone, but
  the two real reasons stand: every design reference in the library is plain
  HTML/CSS so it ports 1:1 instead of being translated into components, and a
  static folder deploys to Netlify with zero configuration and cannot fail a
  build at 2am.
- **Still ES modules and a small state store** — those are about not writing bugs,
  not about coordinating people.

**Consequence worth stating plainly:** with no second person reading the code,
nothing catches a bad decision except tests and actually looking at the screen.
So the [[How to Verify a Web Page You Cannot See]] discipline matters *more* here,
not less — screenshot it and drive it with real events before calling anything
done.

---

## 2026-08-21 — Three looks pulled from the design library

> *"just note this so we can use the card animation u remmber the one we can swipe
> left or right and see the next one, and also if u see i can use bookshelf for the
> type of things u wanna see on someones profile, and when u go to their photo
> section book u can use the blurr circle thingy, where we can do it also in phone"*

He is shopping in the library rather than letting me default — which is exactly
what the library is for. Three assignments, all with prior art:

### 1. Swipe deck → the foil card stack

From [[Aufan Foil Portfolio]] (reused in Peak & Pan v3 for dishes). Three nested
layers, because tilt and sheen both want `transform` and whichever writes last
wins:

```
.card        perspective
└ .card__tilt   JS writes the pointer/drag tilt here
  └ .card__face CSS owns the artwork and the foil sheen
```

**The hard-won number: a stack needs far bigger offsets than feel right.** 6–8px
between cards in a pile vanishes completely behind the top card. It took **13–18px
of x, up to 56px of y, and 4°+ of rotation** before it read as more than one card.
Start there, do not start small.

Holographic sheen: a `repeating-linear-gradient` of rainbow bands at
`background-size: 300%`, position driven from the pointer, `mix-blend-mode:
color-dodge`, plus a second radial `overlay` layer for specular glare. The 3×
size against a 0→1 pointer ratio is what makes a small movement sweep light a
long way — that speed differential is what reads as *light on a surface*. **Keep
wide `transparent` gaps between bands and cap opacity around .34**, or the foil
eats the card's own colour and every card looks identical.

For Biomate the card face is the group's favourite photo (above), so the foil
becomes a glaze over a photograph rather than over flat artwork — likely needs
the opacity even lower. Verify, don't assume.

### 2. Profile sections → the bookshelf

From [[Aufan Shelf Portfolio]] (`portfolio-desk`, the one he froze as his
favourite), reused unprompted in Peak & Pan v3 as the settings screen. Each book
is three faces off a spine div — spine, top pages, fore-edge — via
`rotateY(-90deg)` and `rotateX(-90deg)`, varying width and height per book, one
or two leaned with `rotateZ` so the row is not robotic. Page texture is a
`repeating-linear-gradient` of 1px lines.

**Here it becomes the profile's table of contents**: each book is a section of
someone — photos, hikes completed, badges, gear, reviews. You pull a book off the
shelf to open that section. It answers a real problem too, which is that a
profile with six equal-weight tabs looks like a settings menu; a shelf makes the
sections feel like *things a person has accumulated*, which is the right emotional
register for a social app.

### 3. Photo section → the focus lens, **on phone**

From ref 20 Sanctuary, scaled up for [[Aufan Contact Sheet Portfolio]]: one veil
over the whole grid with a hole punched at the pointer.

⚠️ **He is explicitly overriding the existing rule.** [[Web Elements Catalogue]]
says to hide the lens below the pointer breakpoint because "it's a mouse idea, and
on touch it just hides content." He wants it on phone. **The reference is the
lesson — so solve it, don't refuse it.** Worked answer written up in the
catalogue; short version:

**Aufan's spec, which overrides mine:**

> *"i think just like in phone it is a circle there, and if u hold u kinda drag
> it around for phone ones for the blurr thingy"*

**A visible circle sits on the grid. Press it, drag it, let go — it stays where
you left it.** Direct manipulation, not scroll.

I had proposed pinning the lens to the viewport centre and letting scroll carry
photos through it. **His is better and the reason is worth keeping:** you use a
lens to inspect *a particular photo you have already spotted*, so the interaction
has to be "point at that one", not "scroll until it arrives". Mine turned an
active choice into waiting. Noted as a rejected alternative, not deleted, because
the pinned version is still the right answer for a *feed* you scroll rather than
a *grid* you scan.

Three problems it has to solve, with the answers:

- **Your finger covers the thing the lens reveals.** Offset the lens centre
  ~72px **above** the touch point while dragging — the same lift iOS uses for its
  text-selection magnifier, so it is already a learned gesture. Snap the offset
  in over ~120ms on press so the jump reads as the lens *lifting*, not as a
  mis-hit.
- **Dragging the lens must not scroll the grid.** `touch-action: none` on the
  circle only. Everywhere else the page scrolls normally, so there is no
  hold-delay to wait through and no gesture conflict to arbitrate.
- **It has to look grabbable.** A hairline rim plus a soft outer shadow at rest;
  on press, scale the rim ~1.06 and deepen the shadow. Without a rim the lens
  reads as a rendering artefact rather than a control.

At rest it sits slightly above centre (~44%, out of thumb territory) so it is
visible in the first frame and the mechanic needs no explanation. Release leaves
it in place, which is what makes "drag it over, then tap the photo" work as one
continuous move.

Desktop keeps pointer-follow. **Same component, same `--x/--y` custom properties
— only the source of the values changes.**



---

## 2026-08-22 — The three Figma-vs-brief forks, resolved

Asked after reading the Figma (`03-figma-read.md`). All three answered; all three
change the schema.

### 1. A swipe card is a HIKE SOMEONE IS HOSTING

Not a person, not a standing group. **The card is an event** — like the Figma's
*"Uluru and Kata Tjuta – Looking for friends!"* page — carrying the group's
favourite photo, the host, the date, the difficulty and the distance away.

**The event IS the group.** Swiping right is requesting to join, and that lands
you in that event's group chat. This reconciles all three sources that looked
contradictory: the brief's "matching with hiking groups", Aufan's "the group
photo, their favourite photo together", and the Figma's host + fixed date + RSVP
flow.

**Consequences for the data model:**
- The central table is `hikes` (host, title, photo, date, difficulty, description,
  location, tags), **not** `groups` and **not** a people-matching table.
- `hike_members` carries membership and status (`requested` / `joined` / `left`),
  which is also what makes *"number of unique people you have hiked with"*
  computable — count distinct co-members across your completed hikes.
- Swipes are a table of their own (`hike_id`, `user_id`, `direction`) so a card
  never reappears, and so a right-swipe is an auditable join request rather than
  a silent insert into membership.
- A standing group never has to exist. **No group lifecycle, no roles, no "what
  is this group for between hikes"** — a real simplification.
- 1:1 DMs still exist (the Messages screen shows them alongside group threads),
  but they are a *consequence* of meeting someone, not the matching mechanism.

### 2. The host sets the date — no availability grid

Milestone 2's *"LettuceMeet-style calendar availability page"* is **out**, in
favour of what the Figma already shows: the host fixes a date, everyone else
RSVPs.

Why this is the right call and not just the easy one: it is how hiking meetups
actually work — somebody proposes a specific day and you are in or out — and a
fixed date is what lets every *other* screen work. A card, a list row and a
notification all need a date to show. An event whose date is "to be decided by a
poll" weakens the whole app to strengthen one screen.

**Milestone 2 therefore becomes: the group chat + the agenda page** (purpose,
activities, stop points), both of which the design already has.

⚠️ **This is a scope change from the written brief.** It goes in the PRD's *Not
built* section with the reasoning above, not silently dropped — a marker
comparing the app to the brief will look for it.

### 3. Photoscan is real, and it is the honest AI story

*"Point at a plant or animal to identify it."* It owns nav slot 2, so it was
never a side feature — it just never made it into the written brief.

**It does real identification.** That changes what I told Aufan earlier: I said
the PRD should state there is **no AI inside the product**, because the matching
is a weighted preference-overlap score. That statement is now wrong and must be
rewritten. The correct one is sharper and more defensible:

> One model doing one job well — identifying a plant or animal from a photo.
> Everything else in the app (matching, events, chat, stats) is deterministic and
> is not described as AI.

That is a far better position in front of a judge than either "no AI" or a
scoring function dressed up as intelligence.

**⚠️ The architecture this forces.** A vision model needs a key, and the demo is
public on GitHub Pages. **The key must not be in the browser.** So Photoscan
routes browser → **Supabase Edge Function** → vision API, with the key held as an
edge-function secret. Consequences:
- First piece of server-side code in the project. Supabase MCP has
  `deploy_edge_function`, so no new hosting.
- Needs rate limiting per `auth.uid()`, because a public demo with a paid API
  behind it is an invitation.
- **Needs a graceful failure**, not a spinner that never ends: a clear "couldn't
  identify this" with the photo kept and a retry. Per the Peak & Pan rule that a
  silent capability failure reads as a broken build.
- Peak & Pan's pattern of pasting a key into `localStorage` at runtime is **not**
  usable here — it works for a solo user, not for judges opening a link.

---

## 2026-08-22 — PRECEDENCE, and a decision I got wrong because of it

> *"the one on whiteboard, and context is the priority you should follow, these
> figma is the structure and u can add like these if it is not to what i gave you"*

**The order of authority, from now on:**

1. **The written brief + the whiteboard photos — what gets BUILT.** The feature
   set comes from here. If the Figma is missing something the brief asks for, the
   brief wins and it gets built anyway.
2. **The Figma — how it is STRUCTURED and how it LOOKS.** Layout, hierarchy,
   palette, type, nav, component shapes.
3. **Figma-only features — additive.** Something in the design that the brief
   never mentioned is a bonus to keep, not a contradiction to resolve away.

This is the opposite of how I had been reading it. I had been treating the Figma
as the newer and therefore more authoritative source, and resolving conflicts in
its favour. Wrong: **the design is unfinished, the brief is not.** Absence from
the Figma is not evidence against a feature — it is just a frame nobody has drawn
yet.

### ⚠️ Reversal: the availability picker is back IN

I dropped it (see the section above) because the Figma's event page shows a
**fixed date set by the host** and a *"Message tanish.rathor to RSVP"* CTA, with
no poll anywhere. Under the correct precedence that reasoning does not hold.

**The brief is explicit** — Milestone 2: *"a button that sends them to a calendar
availability page similar to that of Lettuce Meet."* **The whiteboard is explicit
too** — *"give availability"*, *"add to calendar widget"*, *"keep track on the
plan"*, all hanging off the permanent planning chat.

**Both sources can be honoured at once, and the result is better than either:**

- The host **proposes** a date when creating the hike — the Figma's structure,
  and what makes a card, a list row and a notification all have something to show.
- Inside the group chat, an **availability button** opens the LettuceMeet-style
  grid — the brief's Milestone 2. Members paint when they are free; the overlap
  heatmap shows the best window; the host can **confirm or move** the date to it.

So the proposed date is a *starting point the group can converge on*, not an
immovable fact. That is closer to how a hike actually gets organised than either
source alone, and it means no screen is left without a date.

**Consequences:**
- `hikes.date` becomes a **proposed** date plus a `confirmed` flag.
- New table `availability` — `hike_id`, `user_id`, and the slots they marked.
- The availability grid returns to the reference list for Variant. It is the
  hardest UI in the app and there is no design for it, which is exactly why a
  reference is worth having.

### What this does NOT change

- **The swipe card is still a hosted hike.** That reading came from the brief
  ("matching with hiking groups") and Aufan's own words ("their favourite photo
  together") as much as from the Figma — all three agree, so precedence never
  had to arbitrate.
- **Photoscan stays.** It appears only in the Figma, which under rule 3 makes it
  additive rather than contradictory. It keeps nav slot 2 and it stays real.
