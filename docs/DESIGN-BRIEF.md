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

## The writing system (locked 2026-09-02)

**Anchor world: the desk.** id8 speaks like a trading desk — a room where
work happens, not a product that markets itself. Every string in the app
comes from this register, with one exception: the tagline
("a canvas for your thesis") is the single poetic line the brand gets.

### Lexicon

| say | never say |
|---|---|
| the desk | the app, the platform, the tool |
| a session | a demo, a tutorial, onboarding |
| the thesis / the play | your idea, your content |
| the tape | market data, insights |
| the feed | activity, updates |
| the board | the constellation, the canvas view, the 3D view |
| the ledger | history, portfolio |
| replayed | demo mode, example |
| the clarifier / the analyst / the skeptic | the AI, the assistant, the model |

### Register rules

- UI chrome: lowercase mono, short declaratives. Buttons are bracketed
  verbs of the room: `[ open the desk ]`, `[ take it to the board ]`.
- Agents speak in sentence case, ask questions, never advise, never
  celebrate. The desk never compliments the trader.
- No exclamation marks anywhere. No marketing verbs (discover, unlock,
  supercharge, elevate). Banned words: demo, tutorial, onboarding, AI,
  powered by, insights, seamless.
- No em dashes, en dashes, or double hyphens, anywhere: UI copy, desk
  captions, and all three agents' prose (prompt rule plus a server-side
  sanitizer). Plain sentences with periods and commas. The middle dot is
  the only separator, and only in labels (session 001 · $NVDA).
- Numbers are always exact figures from the tape — copy never rounds,
  never invents.
- The hard rule appears in desk deadpan wherever authorship could be
  doubted: "writes your trade — never", "id8 will not write this for you."

### The one door (locked 2026-09-02)

The front door has a single action. First visit: `[ open the desk ]` plays
a replayed session (skippable — the hallway, not a side room) and lands on
the trader's own blank page. Ghost seen, or a session in progress: the same
button reads `[ back to the desk ]` with the session slug beneath it and
resumes quietly. There is no demo fork; the desk shows you one session,
then it's yours.

## The 32-bit accent (locked 2026-09-02)

A quiet console texture across the whole app — pixel + dither flavor,
accent intensity, never a costume:

- The global overlay is an ordered dither (Bayer-style 4px tile), not film
  grain: the darkroom is rendered, not photographed.
- The eclipse falls off in posterized bands with a dithered edge — a
  32-bit light source, still the locked cream-on-black mark.
- The desk's dialogue frames are pixel-notched boxes (.pixel-box), and the
  "the desk ›" prefix is set in Silkscreen (--font-pixel). ONLY the desk's
  voice wears the pixel font; agents and all working copy stay JetBrains.
- Rule of thumb: you notice it, you couldn't call the app retro. No
  sprites, no scanlines, no pixel body text.

## The horizon (locked 2026-09-02)

The door and the calm pages (Present, Clarify) stand on a dithered
horizon: a posterized floor-glow with a dithered edge and a hairline
floor-line, drifting on a 36s breath (still under reduced-motion).
Pure atmosphere — it never carries content. The cockpit keeps its own
board and does not use it. Rule: whisper volume; if a screenshot makes
you notice it first, it's too loud.

## The opening window (locked 2026-09-02)

After the door, the desk asks one question in a pixel-box dialog:
"the desk › what are we looking at?" — a $TICKER field, [ check ], and a
quiet hatch: "[ trading a narrative, not a name ]". The eclipse's travel
lands on the seed inside this window. On [ check ] the desk resolves the
ticker against the live tape and acknowledges it ("found · chain · mcap ·
● live", exact figures) before advancing. The ticker becomes the session's
name ($EIGEN), rewrites Present's headline ("what's the play on $EIGEN?"),
briefs the clarifier (never asks WHAT the vehicle is — only WHY), and
seeds the analyst's evidence plan. Sector and narrative plays stay
first-class through the hatch.

## The board (locked 2026-09-03)

The cockpit is the peak of the pressure arc; its chrome follows the desk
register and the board stays legible at any yaw:

- Labels never pile up. Each label claims a screen box front-to-back; a
  label that would land on a claimed box flips to the node's left, then
  steps down, and gets a hairline leader back to its node. The locked node
  always keeps its natural place.
- Edge grammar: supports = solid green; contradicts (evidence on the tape)
  = red dashed; risk (an open question, nothing verified yet) = red dotted
  at whisper alpha. Risk nodes orbit outside the evidence ring.
- The feed is a transcript, not a ticker. Each line types once, in order,
  and stays; nothing loops. Typing is clock-driven so a backgrounded tab
  catches up instead of stalling. Only the analyst and the skeptic speak
  here — the desk explains furniture, agents never do.
- Phases not yet built don't invite a click. Only the live phase wears
  brackets.
- Footer of the feed: "what the tape found · what the skeptic doubts.
  id8 will not write this for you." — no promise of an action the room
  can't take yet (defend/revise/concede arrive with Structure).

## Structure — the ruling (locked 2026-09-03)

The tape is in; the trader rules on every line of the contract in their
own words. No agent speaks in this phase; it spends no tokens.

- Verbs: `[ hold ]`, `[ revise ]`, `[ cut ]`. A held contested line needs
  one sentence — "why you hold it against the tape". Revise prefills the
  trader's own line, never agent text. Cut strikes it; it leaves the board.
- Supported and unverified lines are held by default; revise/cut stay
  available quietly (hover-reveal).
- Open questions: `[ answer ]` in your words (joins the book as a line,
  unverified) or leave it open (stays on the board as risk).
- The one gate into Commit: contested lines ruled, and an **invalidation**
  named — "what takes this off the book: a level, a flow, or an event."
- The thesis can be revised (`[ revise the thesis ]`) or kept as written.
- Desktop: the ruling column beside the live board with the HUD gone; the
  board settles as rulings land (cut nodes leave, held-against-the-tape and
  revised lines earn acid tags). Mobile: the column only.
- Commit lands full circle on a quiet page: the thesis after the tape, the
  ledger ("04 lines in · 03 held (1 against the tape) · 00 revised · 01
  cut"), every line with its status, and "off the book if". Doc export and
  share link come with the Commit pass.

## Commit — the doc (locked 2026-09-04)

The doc leaves the desk two ways, and nothing is stored anywhere:

- `[ copy a link ]` — the link IS the doc: the one-pager is deflated and
  base64url-encoded into `/s?d=…` (≈1–1.5 KB). The share page renders on
  the server (readable on a phone, readable without JS) with the thesis
  after the tape, the ledger, every line with its status and its receipts
  (exact figures from the tape), open questions, "off the book if", and the
  analyst/skeptic lines. Footer: "pressure-tested on id8 · live nansen
  tape · writes your trade: never · [ open the desk ]".
- `[ copy as markdown ]` — the same doc as markdown, receipts included,
  link in the footer.
- The unfurl card (`/api/og?d=`) carries the thesis, the ledger line, and
  the invalidation on darkroom black — the receipts stay on the page.
- If the clipboard refuses, the link is shown in the open instead of
  failing quietly: "the clipboard said no — the link is right here".
- Nothing marketing-shaped on the share page: no signup wall, no counters.
  One quiet door back to the desk.

## The board, revised (locked 2026-09-04)

Jeffrey's read of the finished board: too many orbs, always moving,
chaotic. The board is now progressive and still:

- Only the thesis and its lines show at first. A folded line carries its
  count (· 2 ev, · 1 open). Each line wears its verdict: contested red,
  supported green, held-against or revised acid, unverified ink.
- Click a line and its evidence fans out; click the thesis and the open
  questions do. Clicking another line folds the last one. Evidence keeps
  its parent open. Arrivals ease in over 460ms; nothing pops.
- Still until dragged. No auto-rotation. The view and the arrival clock
  persist across changes, so opening a line never resets where you're
  looking from.
- Ambience: the core glow and the drifting debris stay. The grid and the
  disc under the core are gone.
- Hint: "drag to rotate · scroll to zoom · click a line to open its evidence".
