# id8 — Design Brief v1.0

**Captured 2026-08-26, from Jeffrey's vision session. This is the target the
foundation gets built toward; polish sprint (~Sept 5–13) executes against it.**

## The correction

The v0.4 Darkroom/Cockpit build reads **galaxy/space**. The vision is
**neutral tones, calm, clarity, brainstorming** — especially on first entry.

## The core concept: calm → pressure → calm

The session has an emotional arc, and the interface follows it. The room gets
more instrumented as scrutiny increases, then exhales.

| Phase | Energy | Treatment |
|---|---|---|
| 01 Present | calm (gallery) | Paper, vast whitespace, almost no chrome. The blank page is the hero. |
| 02 Clarify | calm, conversational | Hairline structure appears as the Clarifier extracts assumptions. |
| 03 Challenge | peak instrument | Full HUD energy — constellation, target-lock, evidence. (Treatment open — see Q1.) |
| 04 Structure | organizing | Mid energy; the map settles into order. |
| 05 Commit | calm (gallery) | Full circle: the clean one-pager on a quiet page. |

Locked decisions (Jeffrey, 2026-08-26):
- **Ground: warm paper** — cream/bone/ivory. The Atelier lineage wins.
- **Entry vibe: airy studio/gallery** — whitespace as luxury; the user's idea
  treated like a piece on a clean wall.
- **Composition: calm entry, instrument deeper** — Present is minimal;
  instrument energy is *earned* as phases deepen.
- **Accent: sage/muted green** — replaces acid yellow. Calm but still reads "go."

## The front door (locked 2026-08-26)

First thing a user ever sees: **a clean blank slate with the hero logo.**

- **Flow: logo → straight in.** No marketing page, no steps. The app is the
  site. Click [ begin ] (or Enter) and the front door dissolves into the
  blank Present page.
- **The mark: THE ECLIPSE** (locked 2026-08-26, from the MindShift reference).
  An orb catching light with a motion-blur trail — the idea, mid-motion.
  Ink on paper (trail reads as graphite smudge), cream on black. The orb alone
  is the app icon/favicon; it breathes slowly (5s cycle) as the only motion on
  the front door. Wordmark: roman bold "id" + light *italic* "8" — the italic
  is the idea moving. (Earlier bracket-dot "an idea, held" mark: retired;
  bracket grammar lives on in UI, not identity.)
- **The signature transition:** on begin, wordmark/CTA fade and the *eclipse
  itself travels* into the Present page — shrinking and turning sage as it
  lands as the breathing seed next to the phase eyebrow. The logo doesn't
  link to the product — it becomes it.
- **First screen contents:** mark + wordmark, one tagline whisper
  ("you think · we interrogate"), one [ begin ] button. Nothing else.
- **Auth: try first, auth later.** Anonymous sessions with zero friction;
  magic-link auth appears only at save/share. Judges and first-timers reach
  the typing surface in one click.

## Tokens (draft — validate in mockup)

```
--paper:  #F3EFE6   ground (warm ivory)
--card:   #FAF8F2   raised surface (barely lighter; hairlines do the work)
--ink:    #1F1D18   warm near-black
--muted:  #85806F   secondary text
--faint:  #B8B2A2   tertiary / hints
--line:   #DDD7C8   hairlines
--sage:   #6B7F5E   accent + supports/go (darker #5F7357 for text on paper)
--clay:   #B5543B   contradicts/risk — warm, serious, not alarming
```

Type: keep the brand grammar — **JetBrains Mono for metadata/labels**
(eyebrows, counters, tags), **grotesk for body/display**. Calm comes from
scale, spacing, and restraint, not from changing faces. (Optional exploration:
a serif for the Commit one-pager — museum-label energy.)

Carryover DNA (what makes it still id8): corner-bracket target-lock grammar,
mono eyebrows, crop marks (ultra-faint on paper), the typewriter agent feed,
"authorship: human" labeling. These survive every phase treatment.

Kill list (the space-makers): black void ground, glow/volumetric gradients,
pixel debris, grid floor as default, acid yellow as global accent.

## Motion

Calm phases: slow, few, soft — fades and settles, nothing glides in from
off-screen. Instrument phases: the v0.4 interaction energy (drag, lock, snap)
is allowed. `prefers-reduced-motion` respected everywhere.

## Open questions

1. **Challenge treatment** — two candidates, decide during polish sprint:
   a) *Paper instrument*: constellation as pencil-line drawing on paper —
      sage locks, clay contradictions, no void.
   b) *The lights dim*: Challenge alone shifts to a darker room (the v0.4
      cockpit, re-toned calmer) — "the interrogation room" — then Commit
      returns to daylight. Higher drama, more build cost, risks re-importing
      the space vibe.
2. Does the constellation appear at all in Present (a faint seed dot), or is
   entry pure page?
3. Serif or grotesk for the Commit one-pager export?

## Reference lineage

Round 1 refs (NORTH, OBSIDIAN, RTX spec sheet, MindShift, life 2.0) → cream
ink, mono metadata, crop marks, spec-sheet data rows. Round 2 refs (game
menus, THE CUBE, Stapelfeldt) → bracket target-lock, floating panels,
instrument interactions. This brief re-grounds all of it on paper.
Design history: `docs/worlds-demo.html` (v0.1–v0.4).
