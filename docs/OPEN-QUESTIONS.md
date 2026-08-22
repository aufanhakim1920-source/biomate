# Questions we had, and how they were answered

Kept as a record rather than deleted. Track 3 scores whether a team can defend
its decisions, and this is where several of them were actually made — including
two the brief and the design blueprint disagreed about.

**Nothing here is still open.**

---

## Settled before building

| Question | Answer |
|---|---|
| What is it called? | **Biomate** — slug `biomate`, used for the repo, the Supabase project and the `localStorage` keys |
| Identity model | Supabase **anonymous auth** — a real `auth.uid()` from a signed JWT, no signup screen |
| Stack | Vanilla HTML/CSS/JS, ES modules, no build step |
| Hosting | GitHub Pages throughout, so the link people are sent is never stale |
| Phone or desktop? | **Phone-width first.** The blueprint's frames are phone-sized and every layout decision follows from that; it stays usable up to desktop |
| Public or private repo? | **Public** — a hackathon submission has to be readable |
| Anything involving real money? | **No.** Nothing in the app touches a payment provider |

## The three that actually changed the product

**Who creates a group?** The brief said users swipe on *groups* but never said
where groups come from — either a user creates a hike and others swipe onto it,
or groups form automatically from matching preferences. This was the biggest
schema fork in the project.

→ **A card is a hike someone is hosting.** The event *is* the group. It removed
an entire database table, deleted the "what is this group for between hikes"
problem, and made "how many unique people have you hiked with" fall straight out
of co-membership. Recorded as **A1** in the divergence log.

**Does the trail recorder need real GPS?** A replayed sample track would have
been reliable in a presentation room; `navigator.geolocation` needs HTTPS and
stops when a phone locks.

→ **Real GPS.** The recorder uses the device's actual position, with accuracy,
speed and movement gating plus an iterative Douglas–Peucker simplifier so a
four-hour walk neither crashes nor becomes a scribble. Where the browser cannot
deliver — a locked phone stops recording — **the line breaks** rather than
drawing a straight guess across ground that may not have been walked. Faking it
would have contradicted the standard the rest of the app is held to.

**Is gender a filter, a safety feature, or both?** The brief listed gender among
the matching preferences. The design blueprint's onboarding asked for
**pronouns** instead.

→ **Pronouns, shown on your profile, never used to filter who you see.** The
design quietly improved on the brief and the improvement was kept: pronouns are
identity to display, whereas gender as a filter sorts strangers by a category
the product has no reason to sort by. Recorded as **A3** in the divergence log.

---

See [DIVERGENCE-LOG.md](DIVERGENCE-LOG.md) for every decision that departed from
the inherited blueprint, and why.
