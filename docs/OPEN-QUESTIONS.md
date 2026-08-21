# Open questions

Answered ones move to the table at the bottom. Nothing here blocks you from
filling in `brief/` — answer them whenever, or let the brief answer them for
me.

## Blocking (I can't create the remote things without these)

1. **What's the project called?** Needed for three things at once: the folder
   name, the GitHub repo, and the Supabase project. All three are renameable
   afterwards but the repo URL is the one people will already have been sent,
   so it's worth getting right the first time.
2. **A short slug** for it — lowercase, hyphens, e.g. `peak-and-pan`. Used
   for localStorage keys and the repo name. I'll derive one from the name if
   you don't care.

## Answered by the brief (2026-08-21)

The project overview landed — `brief/notes/01-project-overview.md`. It settled
the biggest one:

- **Data is shared between users, and matching is on GROUPS not people.** You
  swipe through hiking *groups*; a match drops you into that group's chat. So a
  group is a first-class row, chat is per-group, availability is collected across
  N members, and "unique people you hiked with" is computable from participation.

Three milestones, in order: **1** swipe matching + preferences → **2** group chat
with a LettuceMeet-style availability page and an agenda page → **3** a
Strava/UltraTrails-style trail recorder (distance, duration, unique people,
stats).

Gamification (streak, levels, badges) is explicitly **secondary** to the social
features.

## ✅ Resolved 2026-08-22, after reading the Figma

| Question | Answer |
|---|---|
| Who creates a group? | **Nobody — there are no standing groups.** A host creates a *hike*, and the hike is what you swipe on. Swiping right requests to join and drops you in that hike's chat. |
| Person, group, or event on the card? | **A hosted hike.** Reconciles the brief, Aufan's "group photo", and the Figma's host/RSVP flow. |
| Availability picker? | ⚠️ **REVERSED 2026-08-22 — it is IN.** I dropped it on the Figma's evidence; the brief and whiteboard both ask for it, and they outrank the Figma. Host *proposes* a date (Figma structure), the group paints availability in the chat (brief Milestone 2), host confirms or moves to the best overlap. |
| Photoscan? | **Real identification**, via a Supabase Edge Function so the key never reaches the browser. Becomes the product's one honest AI claim. |
| Phone or desktop? | **Phone.** Figma frames are 402×874 (iPhone 16/17 Pro). |

Still open: whether the trail recorder uses real GPS, whether gender is a filter
or a safety feature, and the deadline.

## New, from the brief

8. **Who creates a group?** The brief says users swipe on groups but not where
   groups come from. Two very different products: (a) a user creates a hike and
   others swipe onto it, or (b) groups form automatically from people whose
   preferences match. This is the single biggest remaining schema fork.
9. **Does the trail recorder need real GPS?** `navigator.geolocation` works in a
   browser but needs HTTPS and only tracks while the tab is open — a phone
   screen-locking mid-hike stops it. If the demo needs a convincing recording, a
   replayed sample track is honest and reliable; live GPS is neither on a laptop
   in a presentation room.
10. **Is gender a filter, a safety feature, or both?** It is in the preference
    list. Worth being deliberate about, since "match me with women only" and
    "show me people's gender" are different features with different implications.

## Not blocking, but they change what I build

3. **Phone or desktop?** Peak & Pan was phone-width and every layout decision
   followed from that. If the mocks are wide I'll assume desktop-first.
4. **Repo public or private?** Peak & Pan went public for the hackathon so
   links could be sent. Private is the safer default and flips in one command.
5. **Anything with real money in it?** If so it's a separate conversation —
   Peak & Pan's paywall deliberately contacts no payment provider and says so
   on screen, and I'd want to do the same here rather than fake it quietly.

## Decided

| Question | Answer | Date |
|---|---|---|
| Identity model | Supabase anonymous auth — real `auth.uid()`, no signup screen | 2026-08-21 |
| Stack | Vanilla HTML/CSS/JS, no build step | 2026-08-21 |
| Hosting | GitHub now; Netlify at presentation time for a live link | 2026-08-21 |
