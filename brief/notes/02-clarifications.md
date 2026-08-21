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
