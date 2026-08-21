# team-rocket-project *(placeholder name)*

Second team build with the same university group that made **Peak & Pan** —
new theme, new project type. The brief hasn't landed yet.

> ⚠️ **The folder name is a placeholder.** It gets renamed to the real
> project name before anything is pushed, so nothing bakes the wrong name
> into a repo URL, a Supabase project, or a launcher entry.

## Where things go

```
brief/          ← YOU fill this in: notes, mocks, Figma      (read brief/README.md)
references/     ← design references for this build            (read references/README.md)
docs/           ← decisions, open questions
supabase/       schema.sql — auth, profiles, media, storage, RLS
screens/        one file per page (empty until the design lands)
assets/         icons, fonts, images
auth.js         anonymous auth over fetch, no SDK
db.js           data layer — one interface, local ⇄ supabase
config.js       committed, ships EMPTY
config.local.js gitignored, holds the real keys (copy the .example)
```

## Decisions already made

| | | Why |
|---|---|---|
| **Identity** | Supabase **anonymous auth** | Peak & Pan proved ownership with an `x-device-id` header the client sets itself — spam-resistant, not tamper-proof. Real `auth.uid()` from a signed JWT fixes it, with no signup screen, and upgrades to email/Google later without a data migration. |
| **Stack** | Vanilla HTML/CSS/JS, **no build step** | Teammates clone and run — no npm install. Every reference in the library is plain HTML/CSS, so they port across 1:1 instead of needing translation. |
| **Team workflow** | branch per page | One person per file means no merge conflicts on a deadline. Set up once the screens exist. |
| **Hosting** | GitHub now → **Netlify at presentation time** | Netlify gives the live link for the room. |

## Backend, in one paragraph

Everything runs on the **local driver** out of the box: clone, open, and the
whole app works out of localStorage with no keys and no network. Filling in
`config.local.js` flips the same interface onto real Postgres. That is not a
fallback nicety — it is what keeps a demo alive when the wifi dies, and what
lets the public link work while the database stays private.

Writes are guarded: if the live database fails, the call falls back to local
**and raises `DB.degraded`**. A fallback that hides failure makes an app look
perfectly healthy while writing nothing to the server — that exact bug cost a
session on Peak & Pan.

## Not done yet

- Supabase project **not provisioned** — needs the real name
- GitHub repo **not created** — needs the real name
- `schema.sql` has auth, profiles, the media index and storage; **domain
  tables come with the brief**
- Anonymous sign-ins must be switched **ON** in the dashboard by hand —
  Authentication → Sign In / Providers. It is not scriptable, and nothing
  auth-related works until it is on.
