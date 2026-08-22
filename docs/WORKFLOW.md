# How work gets done on Biomate

Written 2026-08-22, when Aufan said *"gonna throw a bunch of rework"* and asked
for parallel agents. The point of this file is that a session picking the
project up later does not have to re-invent the arrangement.

## `main` is live

GitHub Pages deploys `main` at the repository root. There is no build step and
no staging environment, so **a push to `main` is a deploy to the URL judges
will open.** Everything below exists because of that one fact.

```
main ─────●───────●───────●─────▶  live
           ╲     ╱ ╲     ╱
   work/x   ●───●   ╲   ╱          a task, its own branch
   work/y            ●─●           another task, in parallel
```

## One branch per task

```bash
git switch -c work/<short-slug>
```

`work/leave-group`, `work/trail-gps`, `work/account-auth` — named for the
change, not the person or the agent. The branch is disposable; delete it after
it merges.

## Parallel agents get their own worktree, not their own turn

Two agents editing `C:\Coding\biomate` at once will overwrite each other, and
the failure is silent — the loser's edits simply vanish under the winner's
write. Spawn each agent with `isolation: "worktree"` so it gets its own
checkout of its own branch. Nothing they do can touch anyone else's files.

Where that is not available, the fallback is **file ownership**: tell each
agent exactly which files are theirs and which are off-limits, by name. That
worked for the leave-group task, but it only works while the split is obvious.
Two agents that both need `main.js` need worktrees.

## Merging is a review, not a formality

Before anything reaches `main`:

1. `node --check` every changed `.js`, and `node test/track.test.mjs`.
2. **Open it in a browser and look at it.** "It compiles" is not verification
   in this project — see `docs/DEFINITION-OF-DONE.md`.
3. Check the claims. An agent report is a starting point, not evidence. On the
   leave-group task the agent was right about its own code and wrong about
   what the server would allow — the RLS policy said something different, and
   only reading the policy caught it.
4. Merge, push, then confirm the file is actually live:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" https://aufanhakim1920-source.github.io/biomate/js/<file>.js
   ```

## Things that are easy to break from a branch

- **`config.js` is committed and live-configured.** Testing sign-up or writes
  against a checkout will write to the real Supabase project. To test safely,
  copy the folder, set `driver: "local"` in the copy, and serve that.
- **Browser cache.** `python -m http.server` sends no `Cache-Control`, so a
  browser can pin a stale ES module for hours. Serve on a **different port** to
  get a clean cache. `transferSize === 0` in `performance.getEntriesByType`
  means the browser never asked for the file.

  ⚠️ **Stop the old server before starting the new port, in the same breath.**
  Rotating ports to dodge that cache is the right move; leaving the previous
  one running is not. Four accumulated in one session before Aufan asked why
  six things were running in the background — they were dev servers, not
  agents. `preview_list` before you finish; anything of yours still up is
  litter. Same for the tabs pointing at them.
- **Supabase auth URLs** (Site URL + Redirect URLs) point at the GitHub Pages
  address. Moving hosts means updating them, or every confirmation and reset
  link lands nowhere.

## Agents

`.claude/agents/qa-verifier.md` — verification only. It looks at the running
app, measures instead of eyeballing, and states plainly what it could not
check. Use it before a merge, not after.
