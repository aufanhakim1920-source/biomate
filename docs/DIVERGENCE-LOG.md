# Divergence log

**Catalyst Ingenium 2026 · Track 3 — Forma (Product & UX).**

> *"Implement it faithfully where it's right. Improve it where it's not, but only
> with a reason you can defend. Keep a record of what you changed from the
> original and why. This is the heart of your submission."*

Blueprint: the Biomate Product-thon Figma (`NNSWKzLDoVGtwtM7D0o25u`) and the
written brief that came with it.

> ⚠️ **Blueprint attribution — TO FILL IN.** The Product-thon team whose design
> this was built from must be credited here and on the submission. We have the
> file, not the authors' names; this line is a placeholder until the team
> confirms them, and it must not ship blank.

Every entry is **what the blueprint said → what we shipped → why**. Where we
kept the blueprint we say so, because fidelity is scored too and "we changed
everything" is not a better answer than "we changed six things for reasons".

---

## A. Where the brief and the design disagreed with each other

These are not our improvements — they are conflicts we had to resolve before we
could build anything.

### A1. A card is a hike someone is hosting, not a person
**Blueprint:** the brief says you swipe on *"hiking groups"*. The Figma's card
showed a single person.
**Shipped:** a card is **a hike someone is hosting**. The event *is* the group.
**Why:** it satisfies both readings at once and removes an entire table. There
are no standing groups to maintain, no membership lifecycle between events, and
no "what is this group for right now" problem. It also makes *"number of unique
people you have hiked with"* fall straight out of co-membership rather than
needing its own bookkeeping. **Kept from the brief.**

### A2. The availability grid stays
**Blueprint:** the Figma shows a fixed, host-set date and no availability poll.
Milestone 2 of the brief asks for a LettuceMeet-style picker.
**Shipped:** the host *proposes* a date, the group converges on a drag-to-paint
overlap grid, the host confirms.
**Why:** **the brief wins on function, the Figma wins on look.** Every card
still shows a date, so nothing in the Figma's card design breaks — but the
group can actually settle a day, which is the second milestone's whole point.

### A3. Onboarding asks for pronouns, not gender
**Blueprint:** the brief lists *gender* among the matching preferences. The
Figma's onboarding asks for **pronouns**.
**Shipped:** pronouns, shown on your profile, **never used to filter who you
see**.
**Why:** the Figma quietly improved on the brief and we kept the improvement.
Pronouns are identity to display; gender as a filter sorts strangers by a
category the product has no reason to sort by. **The design was right and the
brief was not.**

---

## B. Where we judged the blueprint wrong

### B1. Photoscan: built, then cut
**Blueprint:** Photoscan appears in the Figma (never in the brief) — point your
camera at a plant or animal and it tells you what it is.
**Shipped:** **removed entirely.**
**Why:** we built the screen, the camera flow and the history. What we could
not build was the part the feature is named after — identification needs a
vision model behind a server-side key, which is out of scope for a static
front-end. That left a feature whose own screen had to explain why its headline
claim did not work. **A feature that apologises for itself is worse than no
feature**, and it was costing a fifth of the bottom navigation.

Removing it meant removing what depended on it: a daily mission
("Identify something") that could never be completed, a badge ("Botanist") that
could never be earned, and an XP term that could never be non-zero — which
would have made the XP breakdown on screen stop adding up. **In a
derived-stats product, deleting a screen is not deleting a feature.**

### B2. The focus lens belongs on other people's photos, never your own
**Blueprint:** the blur-and-reveal lens was specified for photo grids.
**Shipped:** the lens covers **other people's** galleries. Your own is never
blurred.
**Why:** someone else's photos behind a blur is a small act of curiosity — you
can see they *have* photos and roughly what of, and bringing one into focus is
a decision you make. The same blur over your own gallery is pure friction: you
already know what is in there. **An effect that gates access should only gate
content the viewer has not already earned.** Applied everywhere, a reveal
mechanic stops meaning anything and becomes a tax.

### B3. The Location screen has no street map, and says so
**Blueprint:** the Location frame shows a real street map with a search field
over it.
**Shipped:** the screen, the search, and the meeting point — with the map area
stating plainly what it is waiting for.
**Why:** street tiles have to come from somewhere. A tile library and server, a
keyed static-map service, or an embed that sends **every visitor's IP address
to a third party just for opening a plan**. This app currently makes zero
third-party requests and carries no trackers. **We were not willing to trade
that away so a mock would look right.** The screen is honest about the gap and
does the job the blueprint actually gave it — owning the meeting point, which
had been one buried line on the plan page.

### B4. The planner is three views of one plan, not three dead ends
**Blueprint:** Calendar, Location and Gear are drawn as separate frames, each
with the same four tiles at the bottom.
**Shipped:** all three share one header — back, the group's faces, the screen's
name — and one set of tiles, with the current one marked.
**Why:** this is the blueprint's own idea, followed through. The tiles were
drawn on every frame; implemented literally as three screens they became three
places you had to reverse out of. Making them navigate to each other is what
the design was already implying.

### B5. Gear items carry a note, and you can still add one
**Blueprint:** numbered cards with a title and a subtitle — *"Water"* /
*"3 L minimum per person"* — and no way to add anything.
**Shipped:** exactly that, **plus** the add control the mock does not draw.
**Why:** the two-part item is a real improvement and we took it — it changed
our data shape from a string to `{name, note}`. But a shared plan the group
cannot add to is a printed list. **The mock not drawing a control is not the
same as the design saying there should not be one.**

### B6. "When are you free?" instead of "Calendar"
**Blueprint:** the frame is titled *Calendar*.
**Shipped:** the tile says "Calendar Availability"; the heading says
**"When are you free?"**
**Why:** the tile names the destination, the heading names the task. A screen
title should tell you what to do, and the tile already marks which screen you
are on. Small, deliberate, and the only place we overrode a literal label.

---

## C. Where the blueprint was silent and we had to decide

The blueprint is a set of frames. A working product needs the thousand
decisions in between.

### C1. Guest first, account as an upgrade
No blueprint frame covers sign-up. We made an anonymous Supabase user on first
visit — a real auth row with a signed token, so Row Level Security can enforce
"only touch your own row" from day one — and creating an account **converts
that same user in place**, so the id never changes and every hike, walk, badge
and day of streak carries over. There is no migration because nothing moves,
and that only works because guest came first.

### C2. Nothing in the game layer is stored
Levels, XP, badges, missions and streaks are **derived from rows that already
exist**, never written as a score. There is no score column anywhere, so
nothing can drift out of step with reality or be edited from a browser console.
A badge cannot be wrong: if the app says you walked in four states, four rows
say so.

### C3. Accessibility as design, not compliance
Not in the blueprint at all. The swipe deck is fully operable without swiping
(buttons and arrow keys, each card announced). Audio description exists, off by
default. The availability grid has a real keyboard path rather than 105 tab
stops. Contrast was measured — and the brand **failed**: white on the terracotta
is 4.14:1 where AA needs 4.5, so buttons use a darker tone and text uses the
deep red already in the palette. `lang="woi"` on **Womindjeka!** so a screen
reader does not run an acknowledgement of Country through English phonics.

### C4. The trail recorder is real GPS, and says what it cannot do
Milestone 3 asks for trail recording. We used the device's actual GPS, with
accuracy/speed/movement gating and an iterative Douglas–Peucker simplifier so a
four-hour walk neither crashes nor turns into a scribble. **Measured: 50,000
fixes → 851 points held, 4 KB saved, worst deviation 5.99 m against a 6 m
tolerance, distance unchanged by simplification.** Where the browser cannot
deliver — a locked phone stops recording — the line **breaks** rather than
drawing a straight guess across ground you may not have walked.

---

## D. Changes that came from our own team's review

Recorded separately because they are not blueprint divergences — they are the
build being tested by the people who designed the brief.

| Raised by | Change |
|---|---|
| Reia | A selected filter chip **moves to the front of the row**. The row scrolls, so picking the last chip parked the only evidence of it off-screen |
| Reia | Sign-in surfaced in the top bar; profile, account, sign-out and change-password **consolidated onto one page** |
| Reia | "Leave group" removed from the chat header — reachable via the group's name — left aligned and red |
| Fahed | **Womindjeka!** moved to the middle of the map; group photo and profile picture both editable |
| Kaen | Recommendations over a flat tag filter *(in progress)* |
| Rafael | GPX import/export and trail visualisation *(not built — scope)* |

---

## E. What we did not change, and why that matters

Fidelity is scored, so the honest list:

- **The visual language is the blueprint's.** Terracotta and peach, the rounded
  card stack, the watercolour Australia, the display serif — all inherited.
- **The core loop is the brief's**: swipe → join → chat → plan → walk → record.
- **The bookshelf profile** is the design's metaphor and we kept it, including
  spines as sections.
- **The swipe deck's physics** follow the design's intent: drag with rotation,
  commit on distance *or* flick speed.
- **Photoscan was built first and cut second.** We did not dismiss it from the
  drawing; we implemented it, found the part we could not honour, and removed
  it rather than fake it.

---

## F. The standard we held ourselves to

Two rules ran through every decision above, and they are the reason the list
looks the way it does.

**Say what is true on screen.** Where something does not work, the app says so
in plain words instead of hiding it: the Location screen has no map and says
why; the trail recorder tells you a browser cannot record with the screen off;
climb reads *"not measured"* rather than a confident `0 m`; the AI claim is
simply that **there is no AI in this product**, because we removed the one
feature that would have needed it.

**Derive, don't store.** XP, badges, missions, streaks and notifications are all
computed from rows you can go and read. Nothing is a number we asked the client
to keep for us.
