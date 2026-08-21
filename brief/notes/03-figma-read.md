# Figma read — 2026-08-22

File: `NNSWKzLDoVGtwtM7D0o25u` — *Biomate wireframe*. Aufan: **not finished yet**,
sent to look at, not to build from.

24 phone frames at **402×874 (iPhone 16/17 Pro)**. Six downloaded to
`brief/figma/`. **Screenshotted rather than read from names** — see below for why
that mattered immediately.

---

## ⚠️ Frame names in this file are unreliable

`2:755` is named **"Messaging (Light)"** and is actually a **Photoscan** screen.
There is a *separate* frame `2:430` also called "Photoscan (Light)". Several
names repeat across three or four frames ("Homepage (Light)" ×3, "Messages
(Light)" ×5) with different content in each.

This is the [[Peak and Pan]] lesson landing a second time in the same team's
files: **a frame's name tells you what it is called, not what it is.** Every
frame gets screenshotted before anything is built from it. No exceptions, however
obvious the name looks.

## The design language — and it closes the tone gap

Warm, friendly, hand-made. Exactly the register the design library was missing.

| | |
|---|---|
| Primary | burnt orange / terracotta ≈ `#D2552A`–`#E0673A` — buttons, icons, active nav |
| Deep red | ≈ `#A32E2E` — the logo ring, circular back button outline |
| Cream | ≈ `#FAF5EE` — logo field |
| Amber | ≈ `#F0A32A` — the map fill, the middle logo dot |
| Forest green | ≈ `#2E6B2E` — the third logo dot, the onboarding arrow |
| Cards | soft peach→white gradient, generous radii |
| Display | a **bold brush/script italic** — "Discover your friends", "Womindjeka!", "All Messages", "Photoscan" |
| Body | plain system sans |

**Logo mark:** a cream circle with a dark-red ring, containing a grey trail line
with three dots along it — terracotta → amber → green. A route with waypoints.

## What each screen actually is

**Homepage** — Biomate wordmark, "Good morning, Elyse / Where would you like to
explore today?", then a **stylised watercolour map of Australia** with state
names as terracotta pills (NT, QLD, WA, SA, NSW, VIC, TAS), **"Womindjeka!"**
written across it in the script face — Woiwurrung for *welcome*, an
acknowledgement of Country. Below it a **stack of activity cards that fade out
downward** (invite responses, a chat line, new events nearby, who liked your
profile), implying more below without a scrollbar. Five-icon bottom nav: map,
camera, home, chat, cards.

⚠️ **This is not a pin-and-tiles map.** It is an illustration with tappable
regions — a completely different build from Mapbox/Leaflet, and much more
characterful.

**Matchmaker** — "Discover your friends", a filter chip row (Day hikes,
Backpacking, Trail running, Dog…), then one big card: full-bleed photo, gradient
scrim, **"Pavan · 31"**, 📍 "6 km away", a flame badge "Thru-hiker", a bio, and
tag pills. Below it a white circle with a red ✕ and a filled orange circle with a
white ✓.

**Photoscan** — "Point at a plant or animal to identify it." Camera frame with
corner brackets, "Centre the subject in frame", a `Scan` button, "Choose from
camera roll".

**Upcoming Event** — "Uluru and Kata Tjuta – Looking for friends!", hero photo
with a bookmark, then **Details**: 📅 *Monday August 17th*, 👥 *aaron.abbott and 7
others* (verified tick), ⚠️ *Difficulty: Moderate*. A free-text description in a
very casual voice. CTA: **"Message tanish.rathor to RSVP"**.

**All Messages** — "Current activities" holds a group thread (*Uluru and Kata
Tjuta Group!*) with a **stacked overlapping avatar cluster**; below it "All
messages" lists 1:1 DMs. Ends on "Start more conversations!".

**Onboarding (`1:9` and the other unnamed `iPhone …` frames)** — still raw. Logo,
"Welcome", a plain `next` link, a green arrow, system font. Not designed yet.

---

## 🔴 Three things the Figma and the brief disagree about

These are real forks, not details. Answering them changes the schema.

### 1. Do you swipe on people, or on groups?

- **The brief:** *"cycling through different hiking groups… when someone matches
  with a certain group, they are thrown into a group chat."*
- **The Figma:** the card says **"Pavan, 31, 6 km away"** with a personal bio and
  personal tags. That is a person. The screen is titled *Discover your **friends***.

Both readings are supported elsewhere — the Messages screen has *both* a group
thread and 1:1 DMs, so the app clearly has both. But **what the swipe deck
contains decides the core table**: `groups` you join, or `people` you match with
and then form a group from.

### 2. Where did the availability picker go?

Milestone 2 in the brief is a **LettuceMeet-style calendar availability page**.
But the event page shows a **fixed date already set by the host** and a CTA that
says *"Message tanish.rathor to RSVP"*. There is no poll, no grid, no "when are
you free".

So either availability happens *after* joining (settling a time inside the
group), or the design has moved to host-sets-the-date and the picker is gone.

### 3. Photoscan is a whole feature that is not in the brief

"Point at a plant or animal to identify it." It has its own screen, and it owns
the **second slot in the bottom nav** — so it is not a side feature.

⚠️ **This is the one place real AI would genuinely be inside the product.**
Everything else — matching, events, chat — is deterministic. I told Aufan the PRD
should state plainly that there is *no AI in the product* and that the matching
must never be called an "AI matching algorithm". **If Photoscan does real
identification, that statement changes**, and it becomes the honest, defensible
AI story: an image classifier doing one job well, rather than a scoring function
dressed up as intelligence.

## Not looked at yet

`On Trail (Light)` ×2, `On Trail (BUTTON CLICKED)` ×2, `Profile (Light)`,
`Homepage pt 2` ×2, and the remaining Messages/Homepage variants. Worth a pass
before building — especially On Trail, which is Milestone 3.

---

# Update — 2026-08-22, second read

Re-read after Aufan said the file had moved. **33 → 35 frames.** Two new real
screens, one stray 46px component, one deleted Button. No renames.

## `31:3326` — "Plan your activity" — the chat bio page

Two overlapping circular avatars at the top, the title in the brush script, then
a **large empty bordered box** (the plan content area — not designed yet), then
four buttons in a 2×2:

| **Calendar Availability** 📅 | **Location** 🗺 |
| **Gear** 📅 | **Save** (filled orange primary) |

**⭐ This settles the availability question for good.** *Calendar Availability* is
a real, drawn button on a real screen. The reversal I made earlier — putting the
LettuceMeet grid back in after wrongly dropping it on the Figma's evidence — was
right, and now the Figma agrees rather than merely not disagreeing.

It also tells me where the picker lives: **not on the event page, but inside the
group's planning screen**, reached from the chat. Which is exactly what the
whiteboard said — *"perm chat to plan hikes"* → *"give availability"*.

**Gear** is new information too: a kit list for the hike. Not in the brief, not on
the whiteboard. Additive, per the precedence rule.

## `27:3245` — onboarding step 4 of 5

*"What are your pronouns?"* with a dropdown. Still raw system-font wireframe, like
the other onboarding frames.

Two things worth keeping:
- **The flow is 5 steps.** Now known, where before I only had "there is an
  onboarding".
- **It asks for pronouns, not gender.** The brief lists "gender" among the
  matching preferences; the design asks pronouns. That is a more careful choice
  and it partly answers the open question of whether gender is a filter or a
  safety feature — **pronouns read as identity/display, not as a hard filter.**
  Still worth confirming: does anyone filter *on* it, or is it only shown?

## From the team's Discord (shown by Aufan, not acted on)

Their designer, `calicotheduck`, on the state of the file:

> *"I've got most of it done — it's just the calendar, location and gear buttons
> in the chat bio page. are you able to start on the other pages first? and then
> add on those pages? i feel like i need to think a bit on how to make those
> pages."*

So the three destination pages behind those buttons are **deliberately unstarted**
— she wants to think about them. That matches the build order I would have picked
anyway: everything else first, those three last, and the availability grid
designed from a reference rather than guessed at.

⚠️ Treated as information about the file's state, not as an instruction — it is a
message between other people that Aufan showed me. Confirm with him before
treating it as a work order.
