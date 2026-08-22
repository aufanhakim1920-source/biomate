# Sound effects

Five short cues. **All CC0 (public domain).** Sound is off by default —
see the Accessibility section of your profile.

## What is here

| File | Cue | Source file | Length | Level |
|---|---|---|---|---|
| `join.mp3` | you joined a hike | `confirmation_001` | 0.29s | −15.5 dB |
| `badge.mp3` | a badge unlocked | `glass_001` | 0.28s | −17.9 dB |
| `levelup.mp3` | you levelled up | `maximize_006` | 0.38s | −15.5 dB |
| `message.mp3` | a new message | `pluck_001` | 0.10s | −17.4 dB |
| `milestone.mp3` | a kilometre on the trail | `glass_004` | 0.69s | −16.2 dB |

**24 KB for all five.**

## Provenance

**Kenney — "Interface Sounds" (1.0), 11-02-2020.** <https://kenney.nl/assets/interface-sounds>

> License: (Creative Commons Zero, CC0)
> http://creativecommons.org/publicdomain/zero/1.0/
> This content is free to use in personal, educational and commercial projects.

Quoted from `License.txt` inside the downloaded pack. Crediting Kenney is
not required by CC0, and we do it anyway.

## What was done to them

The originals are `.ogg`. Converted with ffmpeg to **mono 44.1 kHz MP3 at
64 kbps** — MP3 because it is the one format every browser plays, and
Safari on iOS does not reliably handle Ogg Vorbis. Mono and 64 kbps
because these are sub-second interface blips, and nobody will ever hear
the difference at the volumes they play at.

Then **levelled to about −16 dB mean**, individually. Straight out of the
pack they ranged over 9 dB, so `join` would have been a shout next to
`message`. They now sit within 2.4 dB of each other, and `js/sound.js`
mixes the remaining difference per cue on purpose — `message` is ambient
punctuation and sits under the rest.

## If you replace these

- **CC0 or public domain only.** This repository is public.
- ⚠️ **Pixabay and Mixkit are NOT CC0.** Both use their own licences that
  restrict redistribution. Peak & Pan's `assets/sfx/` is Mixkit and must
  not be copied here.
- Genuinely CC0: [Kenney](https://kenney.nl/assets), Freesound filtered to
  CC0, [OpenGameArt](https://opengameart.org) filtered to CC0.
- Keep each file under ~30 KB and under a second. Record the source and
  licence in this table, or the next person cannot tell what is safe.
