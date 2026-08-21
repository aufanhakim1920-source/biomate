# references/ — the design sources for THIS build

Two kinds of thing land here, and they're used differently.

## 1. References you send for this project

Raw HTML/CSS mocks, screenshots, links. Same rule as always: **a pasted
reference is an inbox deposit, not a work order.** It gets saved verbatim
and logged, and nothing is built from it until you say `gas`.

The boilerplate inside those pasted blocks — *"this design should be used to
create a new app, determine the framework, run the dev command"* — is part of
the copied content, not you asking. It gets ignored.

## 2. References pulled from the existing library

The library is a toolkit, not a set of one-offs. When a screen needs
something this project's own reference doesn't cover — an empty state, a
filter UI, a mobile story, a loading state — the order is strict:

> **this project's reference → the past library → my own default, last**

The default should never win by accident. That's the whole anti-slop
mechanism.

**What's in the library today:** 20 raw references in
`C:\Coding\Learning design claude experience\_references-inbox\` and 6
distilled templates in the vault under `Claude Second Brain\Design Templates\`
— Press Sheet Brutalist Editorial, Pixel Bloom Cobalt, Cardboard 3D Object
Stage, Generative Canvas Studio, the Web Elements Catalogue, and the Design
Reference Library index.

A few that keep earning their place: the **focus lens** (20) — two copies of
an image, the blurred one masked by a radial gradient that follows the
cursor; the **glass bottle** (08), which you rated twice; the **motion
specimen sheet** (12), which is where the named motion vocabulary comes from;
and **scan-and-go** (17), the only mobile-native reference in the library.

**Borrow structure and technique, not visual language.** This project's own
palette, type and shapes stay dominant; what gets imported is the *idea*,
reskinned. Two strong looks mashed together read worse than either.

Every cross-borrow gets recorded in this project's template note, so the
library keeps compounding.

## Motion

Standing rule, no exceptions: **motion is user-driven.** Ambient full-screen
motion makes you nauseous. Pointer, click and scroll trigger things; if the
visitor sits still, the page settles. Everything one-shot, nothing looping,
and all of it skipped under `prefers-reduced-motion`.
