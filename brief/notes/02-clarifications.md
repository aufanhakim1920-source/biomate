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


