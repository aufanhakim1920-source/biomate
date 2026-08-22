# Sound effects

Five cues, played by `js/sound.js`. **Sound is off by default** — nothing in
this folder is requested until someone turns the switch on in
**Your profile → Sound effects**.

---

## ⚠️ Status: the system is built, the audio is not committed

**There are no MP3s in this folder yet, and that is a deliberate stop rather
than an oversight.**

The requirement is **CC0 / public domain** audio. Nothing on this machine met
it:

| Source checked | Verdict |
|---|---|
| `C:\Coding\peak-and-pan-v2\assets\sfx\` (9 files) | **Mixkit Free License, not CC0.** Free for commercial use without attribution, but it is a proprietary licence, and Biomate goes to a public repo — redistributing the files themselves is exactly what that licence does not grant. Also 36–91 KB each, over the size budget. |
| `C:\Coding\learn-v1-motion-graphic\...\sound effect\` (3 files) | No licence recorded. One filename (`woosh-mark_diangelo-…`) points at a SoundBible upload that is **CC BY 3.0**, which needs attribution and still is not CC0. |
| Windows system sounds | Microsoft-licensed. Not redistributable. |

Downloading replacements needs Aufan's explicit go-ahead, so the files are left
for him to drop in. **Synthesised oscillator tones were not used as a
substitute** — that was ruled out in the brief, and it is the right call: beeps
are the sound of a prototype.

Everything else works today. With no files present the app is simply silent:
`sound.js` marks each cue dead on its first failed load and never asks again,
the settings screen says so in plain words, and nothing is logged to the
console.

---

## What to drop in

Exact filenames — `sound.js` will not find them under any other name.

| File | Plays when | Wants to sound like |
|---|---|---|
| `join.mp3` | you join a walk (swipe right, or the RSVP button) | a warm, short confirm — a soft two-note lift |
| `badge.mp3` | a badge unlocks | a bright small chime |
| `levelup.mp3` | you reach a new level | a short rising flourish, the biggest of the five |
| `message.mp3` | new messages appear while you're using the app, and once when you switch sound on | a very quiet blip, quieter than you think |
| `milestone.mp3` | a walk is saved, or a streak milestone | a satisfied, settled note |

**Constraints, all of them real:**

- **CC0 / public domain only.** This repo goes public.
- **Under ~30 KB each**, and keep the total small. There is no build step and
  no CDN — every byte here ships as a static file on GitHub Pages.
- **Short.** Under ~1.2s for everything except `levelup`, which can reach ~2s.
  A cue that outlasts the animation it punctuates reads as a bug.
- **Mix quiet.** Per-cue volume is already set in `js/sound.js`; master for
  "noticeable", not "loud".
- Mono is fine and roughly halves the file size.

## Where to get genuinely CC0 audio

- **Kenney** — <https://kenney.nl/assets/category:Audio> — explicitly CC0, game
  UI packs, exactly this kind of cue. The best first stop.
- **Freesound**, filtered to the **Creative Commons 0** licence —
  <https://freesound.org/search/?f=license:%22Creative+Commons+0%22> — check the
  licence on the individual sound's page, not just the search filter.
- **OpenGameArt**, filtered to CC0 — <https://opengameart.org/>

⚠️ **Pixabay and Mixkit are *not* CC0.** Both are free and both permit
commercial use, but they are their own proprietary licences with their own
redistribution terms. If you use one anyway, that is a decision to make on
purpose — write it in the table below and change the wording above, so the next
person is not misled by a file that looks public-domain and is not.

## Record what you add

Every file gets a row. A sound with no provenance is a licence problem waiting
to be discovered by someone else.

| File | Source URL | Licence | Length | Size |
|---|---|---|---|---|
| _(none yet)_ | | | | |

## Adding them

Drag the five MP3s in with the names above. Nothing to register, nothing to
rebuild — `js/sound.js` already looks for exactly these paths, and any file
that is missing is skipped rather than breaking anything.
