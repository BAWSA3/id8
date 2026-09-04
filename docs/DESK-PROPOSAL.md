# The desk (proposal, 2026-09-04)

Jeffrey's framing: the orb phase (door, window, present, clarify, board,
ruling) is the construction of the thesis and its answer. When the first
play goes on the book, a new place opens: the trader's desk. The desk is
home from then on. It holds every play, shows the token live, keeps the
session breakdown in front of you, and re-reads the tape every time you
come back. The orb becomes the brand's character, quiet in the background.

Locked in the clarifying round:

- Desk is home, many plays. The door and the orb flow become [ new play ].
- Contents: the token live, the session breakdown, the invalidation
  watched, the board reopenable per play. All four.
- Persistence: magic link, plays stored server-side (Supabase). Anonymous
  through the first session; the email is asked once, when the first play
  goes on the book. The session is never blocked.
- Live watch on every visit: each play re-reads the tape, no LLM.
- Narrative plays: the token panel becomes the sector, live.
- Look: same darkroom, the cockpit's panels come to the desk. Still.
- Timing: for the comp. Scope is cut to fit.

## The desk, room by room

Darkroom black, the panels from the cockpit (corner brackets, hud-label),
nothing moves unless you touch it. The orb sits behind the panels, large,
at whisper opacity, breathing on the 5s cycle, off-center. It is the
mascot, not furniture: it never carries content and never gets a label.

**Top bar.** Wordmark, `the desk · 3 plays`, `[ new play ]`, `[ sign out ]`.

**The book (left).** Every play as a card, newest first:
`$HYPE · spot floor trade · booked 2026-09-04` with the verdict strip
(04 held · 01 revised · 00 cut) and its watch state: `holding` (green),
`breached` (red, with the figure and the day), `unwatched` (no observable
condition on the tape). Click a card and it takes the main area.

**The token (top right).** The play's vehicle, live from the tape each
visit: price and 24h change, the deepest pool (Dexscreener), the cohort
flows for 7d (smart trader, whale, top PnL, fresh) and the two or three
figures the analyst quoted, then and now. For a narrative play the panel
is the sector: 7d and 30d smart-money netflow, top accumulation and
distribution names. The panel says when it last read the tape.

**The breakdown (center).** The play's one-pager as a place, not an
export: thesis after the tape, the lines with their status and receipts,
the open questions, off-the-book-if. Same component as the share page,
which it already is. `[ open the board ]` reopens the map for this play
(progressive, still), `[ copy a link ]`, `[ copy as markdown ]`.

**The watch (bottom right).** The invalidation, checked against today's
tape. Only conditions the tape can observe are checked (a netflow sign,
a volume floor, a level); a condition it can't (an event, a tagged fund)
is listed as `not on the tape`. The play's status is the worst of its
checks. Every visit appends a line to the play's ledger: date, the
figures, holding or breached. That's the conviction ledger over time.

## The flow change

Door → window → present → clarify → board → ruling → `[ put it on the
book ]` → **the desk opens** with the play in place. The desk asks once:
"keep the desk. one email, one link, no password." Skip is allowed; the
play stays in this browser until they sign in. Returning signed-in
traders land on the desk. Returning anonymous traders land on the door
as today, with `[ back to the desk ]` if a local play exists.

## Data

Supabase, RLS on by default (the BrandOS posture). Tables:

- `desks` (id, user_id, created_at)
- `plays` (id, desk_id, ticker, chain, address, sector, session json:
  thesis, extraction, challenge, structure, booked_at)
- `watches` (id, play_id, read_at, figures json, status holding|breached)

The session json is the Stored object we already persist in the browser,
so migration is a copy. The share link keeps working unchanged (it carries
its own doc). Auth: Supabase magic link, anonymous session upgraded on
sign-in (the local play is written to the new desk).

## Live watch, mechanically

One route, `/api/watch`, called for the plays on screen when the desk
opens. Per play it fans out the same Nansen calls the analyst used
(screener for the vehicle, flow intelligence, sector netflow), compares
against the invalidation with a small rule parser (netflow sign, volume
threshold, price level) and stores a watch row. No LLM in the loop; the
interpretation of anything the parser can't read stays with the trader
(`not on the tape`). Cost: 2 to 3 Nansen calls per play per visit,
cached for an hour.

## Comp scope (9 days)

Days 1 to 2: Supabase project, magic link, tables, RLS tests, anonymous →
signed-in upgrade. Day 3: the desk shell with the orb, the book, the
breakdown (reuses the share page). Day 4: the token panel (ticker and
sector). Day 5: the watch route and the rule parser for the three
observable conditions. Day 6: the flow change at [ put it on the book ]
and the door. Days 7 to 8: polish against the brief, mobile, a live run.
Day 9: buffer.

Cut first if needed: the watch history (keep only the latest read), then
the sector panel for narrative plays (show the breakdown only).

## Open

- Deployment protection is off on the demo project. Real accounts and
  emails land there. Decide whether the comp demo runs on the same
  project or a second one.
- Email delivery for magic links: Supabase's built-in sender is enough
  for the comp; a custom domain sender is a post-comp item.
- Copy for the email ask, in register, no dashes.
