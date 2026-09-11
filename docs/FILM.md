# The film booth

`/film` plays the product over a frozen take with a drawn cursor. Dev only (404 in production unless `ID8_FILM=1`). Nothing on screen is invented: the take in `src/lib/film/sol-take.json` was captured off the live routes on 2026-09-11 and is served back through a fetch shim, so the numbers are real and the take is identical every time.

## Record it (Cursorful)

1. Dev server running: `npm run dev -- -p 3111` in this folder.
2. Open a new **Incognito** window in Chrome (clean storage, no extensions, no book link on the door).
3. Go to `http://localhost:3111/film` and click **[ open the stage · 1440×810 ]**. A popup opens with an exact 16:9 viewport.
4. In Cursorful, record that window (or a region matching it). Turn off Cursorful's own cursor effects and auto zoom; the film draws its cursor. Keep the real mouse outside the stage window.
5. Press **R** in the stage window. The page reloads and the take rolls on its own after a beat, so the first frame is clean.
6. Stop after the end card settles, about 33 seconds in. Trim the first second if you want the cursor's arrival to be the opening.
7. Music goes on in Cursorful or the editor. Export 1080p.

Space rolls a take by hand on `/film` without `?auto=1`. R reloads at any point.

## The camera and the long cut (2026-09-11)

The stage is a viewport-sized box the film scales around a target (`src/components/film/Camera.ts`): the door pushes in on the body, the window fills the frame while the tape answers, the thesis and the first question come up close, the evidence rows after the line opens, the first ruled line, and the watch on the desk. You record flat; the zooms are in the take. The cut now runs past the board: the ruling (hold the first contested line with a reason, cut the rest, put it on the book), the commit page, and the desk with the book, the token live and the watch reading the tape. The desk opens in place (the commit page's link is intercepted in the film). Runs about 40s at 1440×810.

A take named by contract address (`vehicle` on the take) makes the window switch to `[ contract ]` and paste the address instead of typing a ticker.

### Living stills (held frames)

`/film?auto=1&stop=<beat>` runs the take to that beat and freezes it there: the cursor leaves, the camera stays where it is, the grain keeps breathing. Record four seconds in Cursorful, press R, pick the next. Beats worth holding: `found` (the window, zoomed, with the found line), `q1` (the first question, zoomed), `line open` (the board with a line open), `dossier` (the evidence rows, zoomed), `ruling`, `desk`, `watch` (the watch, zoomed), `end`. The door needs no hold: open `/film` and do not roll.

### Freeze a new take

```
node <scratch>/capture.mjs config.json src/lib/film/<name>-take.json
```
`config.json`: `{ "ticker": "SOL" }` or `{ "address": "0x…" }`, plus `thesis`, `answers` (four), and `holdReason`. The script runs the live routes (window, four questions, extraction, the tape, the watch) and freezes every line. Point `Film.tsx` at the new file.

## Beats (measured, 1440×810, the short cut before the long one)

| beat | at | what's on screen |
|---|---|---|
| door | 1.8s | eclipse, wordmark, the cursor arrives and opens the desk |
| window | 3.9s | `$SOL` typed, the tape finds it live: solana, mcap, deepest pool |
| present | 10.6s | the thesis lands by hand, the word gate opens, present the play |
| q1 to q4 | 14 to 21s | four clarifier questions answered, the last two at pace |
| contract | 25s | structured from your words, scrolled top to bottom, signed |
| board | 25 to 31s | the tape lands, the board turns, A4 opens, EV-01 locks with real rows |
| end card | 31s | eclipse, wordmark, tagline, the URL |

## Knobs

- `src/components/film/timeline.ts` `T`: every hold and typing pace.
- `src/components/film/Film.tsx`: `SITE` (the URL on the end card), `TYPE_SPEED`, stage size.
- `src/lib/film/shim.ts` `SHIM_MS`: how long each shimmed call appears to take.
- New take: run the capture script against the routes and replace `sol-take.json` (same shape).

## Quote tweet drafts

A
> building id8 for this. a canvas for your thesis.
> you bring the play. the desk asks the hard questions, then the tape weighs in with live Nansen smart money flows. it never writes the trade.
> id8.markets

B
> most theses die in a notes app. id8 is a desk for them.
> name the token, present the play, get interrogated, and see what smart money is actually doing before you size. built on the Nansen API. never writes your trade.

C
> what i'm bringing to the Nansen hackathon. id8, a canvas for your thesis.
> present the play. get interrogated. let the tape push back. thirty seconds of it below.
