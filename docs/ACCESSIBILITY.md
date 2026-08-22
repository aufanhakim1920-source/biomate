# Accessibility — Biomate

Aufan asked for **audio description** plus anything else worth doing
(2026-08-22). Most of this is carried from [[Peak and Pan]] v2, which shipped a
working version of it; the Biomate-specific items are the interesting ones.

**Framing that matters:** this is an app for getting people outdoors together.
Several of these are not compliance chores — they are features that make the app
better for everyone, and two of them are arguably the best features in it.

---

## ⚠️ Found before writing any code: the terracotta fails WCAG AA

Measured, not guessed:

| Pair | Ratio | AA normal (4.5) | AA large / icons (3.0) |
|---|---|---|---|
| White on `#D2552A` | **4.14:1** | ❌ FAIL | ✅ pass |
| White on `#E0673A` | **3.40:1** | ❌ FAIL | ✅ pass |
| `#D2552A` on white | **4.14:1** | ❌ FAIL | ✅ pass |
| `#D2552A` on cream `#FAF5EE` | **3.82:1** | ❌ FAIL | ✅ pass |
| `#A32E2E` deep red on white | 7.03:1 | ✅ | ✅ |
| `#171717` ink on cream | 16.53:1 | ✅ | ✅ |
| `#2E6B2E` forest green on white | 6.44:1 | ✅ | ✅ |

This hits the **"Save"** button and the **"Message … to RSVP"** CTA — both white
text on terracotta — and any terracotta body text.

**The fix, which changes almost nothing visually:**

- **`#C14E27`** for button fills carrying white text → **4.79:1**, a comfortable
  margin. (`#C85128` lands on exactly 4.50 — too close to the line to trust
  across rendering differences.)
- **`#D2552A` stays as-is** for icons, borders, active nav, and decorative fills.
  Those are graphics and only need 3:1, which it passes.
- **For terracotta-coloured *text* on white or cream, use the deep red `#A32E2E`
  that is already in the palette** (7.03:1). No new colour needed — the brand
  already contains its own accessible text tone.

So: one new shade, one reuse. The design does not have to change character.

---

## What ships

### 1. Audio description — Aufan's ask

`speechSynthesis`, **off by default** (a shared demo link should never start
talking at someone), toggled with a `role="switch"` control that persists.
Describes the current screen and the focused element.

### 2. An `aria-live` region, which is the part people skip

TTS and a screen reader talking at once is worse than either alone. So the same
description that gets spoken is also written into a polite `aria-live` region —
**real assistive tech reads the text, TTS serves everyone else.** This was the
single most valuable accessibility decision in Peak & Pan.

### 3. ⭐ The swipe deck must be fully operable without swiping

**This is the big one.** A gesture-only interface is unusable for anyone who
cannot drag accurately — motor impairments, tremor, a hand full of trekking pole.

- The **✕ / ✓ buttons already in the Figma** are the accessible path. Keep them
  prominent, not decorative.
- **Left/right arrow keys** do the same thing.
- Each card is announced when it becomes the top card — name, distance,
  difficulty, tags — because otherwise a screen-reader user has no idea the deck
  advanced.
- The card is a `div[role="button"][tabindex="0"]`, **not** a `<button>`, because
  its content carries links. (An `<a>` inside a `<button>` is invalid HTML and
  unclickable in some browsers — a rule already learned the hard way.)

### 4. The focus lens must never hide content from assistive tech

Blurred photos keep their `alt` text and stay focusable and reachable. The blur
is a **visual** effect only. Per the standing rule: *a hidden-by-default state
that only JS can reveal is a bug, not an animation.*

### 5. ⭐ The trail recorder speaks milestones

*"Three kilometres. Forty-seven minutes."* every kilometre. Designed for blind
users, useful for **everyone** — your phone is in your pocket while you are
walking. This is the clearest case of an accessibility feature that is simply a
better feature.

### 6. The availability grid needs a real keyboard path

Drag-to-paint across a week × hours grid is the least accessible interaction in
the app. It needs a parallel, not an afterthought:

- Each cell has proper checkbox semantics, reachable by keyboard.
- Shortcuts for whole columns and blocks — *"all Tuesday evening"* — because
  tabbing through 7 × 14 cells is technically accessible and practically cruel.
- The overlap heatmap is **never colour-only**: each cell states its count.

### 7. Colour is never the only signal

Difficulty, RSVP status, who has responded. The Figma already does this right —
difficulty is ⚠️ + the word "Moderate", not a coloured dot. Keep that discipline.

### 8. `lang` on the Woiwurrung

**"Womindjeka!"** on the homepage gets `lang="woi"`. Without it a screen reader
mangles it through English phonics. Small, correct, and respectful of the fact
that the word is an acknowledgement of Country rather than decoration.

### 9. Motion

Already the standing rule from [[Motion Must Be User Driven]]: everything
one-shot and user-triggered, nothing loops or drifts, all of it skipped under
`prefers-reduced-motion`. Ambient motion makes Aufan nauseous — so this one is
tested by its own author.

⚠️ `--force-prefers-reduced-motion` **does not reach `matchMedia` in headless
Chrome** — CSS honours it, JS does not. A reduced-motion JS branch cannot be
verified with that flag; test it another way.

### 10. The ordinary things, done properly

- **`rem` for type**, so the OS font-size setting actually works.
- **44 × 44 minimum touch targets** — the five-icon nav is the one at risk.
- **Skip link** to main content.
- **Visible focus rings** — never `outline: none` without a replacement.
- **Labels on every control**, including icon-only buttons.
- **`prefers-color-scheme` dark mode.** ⚠️ Before adding it, **audit every token
  for dual use.** Peak & Pan's `--bg2` was both a cream background *and* cream
  text on purple; in dark mode the text inverted to the same colour as its own
  surface and vanished. Split dual-role tokens into constants that never move
  *before* writing the second theme, not after.

---

## Verification, not intention

Per [[How to Verify a Web Page You Cannot See]] — these get checked, not assumed:

- Contrast recomputed after any palette change.
- Every screen driven by **keyboard alone**, start to finish.
- The swipe deck completed without a single pointer event.
- Screenshots read, not just captured.
