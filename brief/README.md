# brief/ — your drop zone

**This is the folder you fill in. I read it before writing a line of the app.**

Drop things in raw. Don't tidy, don't rename, don't summarise for me — a
messy note in your own words is more useful than a neat one you had to
translate. If it's a photo of a whiteboard, that counts.

```
brief/
├── notes/    what the project IS
├── mocks/    what it should LOOK like
└── figma/    the Figma file / exports
```

---

## notes/ — what the project is

Anything that tells me the substance. A `.md`, a `.txt`, a screenshot of a
group chat, a photo of a whiteboard — all fine.

The five things that change what I build, in rough priority:

1. **What it does in one sentence**, the way you'd say it to a friend.
2. **Who uses it** and what they're trying to get done.
3. **The core loop** — the one thing a user does over and over. This drives
   the whole data model. On Peak & Pan it was find → butcher → cook.
4. **What's assessed / what the team promised** — the rubric, the pitch, the
   marking criteria if there is one. This decides what has to be real versus
   what can be a stub.
5. **Deadline**, and anything the team has already promised or committed to.

Also worth dropping if it exists: the assignment sheet, your group's plan doc,
and anything the team has already decided and doesn't want relitigated.

(The repo is a solo build — you and me — but the *decisions* are still the
group's, so anything they've settled is worth having here.)

## mocks/ — what it should look like

Screenshots, photos, Figma exports, a sketch on paper. **Filename doesn't
matter, but tell me which screen each one is** — either in the filename
(`home.png`, `02-detail.png`) or in a note next to them.

Two things I'll otherwise get wrong:

- **Is it a phone app or a desktop site?** Peak & Pan was phone-width and
  every layout decision followed from that. If it's mobile, a mock at real
  phone proportions is worth more than a wide one.
- **A screen you show me is a screen I'll build.** If a mock is a rough
  placeholder rather than the real intent, say so in the filename
  (`rough-`, `wip-`) or I'll treat it as the target.

Anything not mocked, I'll design — and I'll pull from the reference library
first rather than defaulting. See `../references/README.md`.

## figma/ — the Figma file

Either:

- **A share link** in a text file here — but it must be a file on **your**
  account with **edit** access. The Figma MCP cannot read view-only files;
  last time the team's original was blocked and you had to duplicate it into
  your drafts first. Duplicate it before sending.
- Or exported frames as PNGs, which works with no access at all.

If you send a link, also tell me the **page name** so I don't guess.

---

## Then say `gas`

Nothing gets built until you do. Once you say it I'll:

1. Read every file in here, and **screenshot every Figma frame before
   implementing it** — the Peak & Pan lesson, three screens were built wrong
   from frame names alone
2. Rename this folder to the real project name
3. Provision Supabase + create the GitHub repo
4. Build

Questions I still owe you are in `../docs/OPEN-QUESTIONS.md`.
