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

## Not blocking, but they change what I build

3. **Phone or desktop?** Peak & Pan was phone-width and every layout decision
   followed from that. If the mocks are wide I'll assume desktop-first.
4. **Who's on the team, and their GitHub usernames?** So I can add them as
   collaborators in the same step as creating the repo.
5. **Repo public or private?** Peak & Pan went public for the hackathon so
   links could be sent. Private is the safer default and flips in one command.
6. **Does the data need to be shared between users, or is per-user enough?**
   This is the single biggest fork in the schema. "Everyone sees everyone's
   posts" and "everyone has their own private list" are different databases.
7. **Anything with real money in it?** If so it's a separate conversation —
   Peak & Pan's paywall deliberately contacts no payment provider and says so
   on screen, and I'd want to do the same here rather than fake it quietly.

## Decided

| Question | Answer | Date |
|---|---|---|
| Identity model | Supabase anonymous auth — real `auth.uid()`, no signup screen | 2026-08-21 |
| Stack | Vanilla HTML/CSS/JS, no build step | 2026-08-21 |
| Hosting | GitHub now; Netlify at presentation time for a live link | 2026-08-21 |
