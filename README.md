# id8 · a canvas for your thesis

The thesis desk for narrative traders. You present a play; id8 interrogates
it, tests it against the live Nansen tape, and hands you back a doc with
receipts. It never writes the trade.

**Live:** https://id8-blush.vercel.app
**Built for:** the Nansen API vibe coding challenge (Sept 14–30, 2026).
Meant to live on after it.

## The hard rule

**id8 never authors your thesis.** The agents ask, structure your own words,
surface evidence, and argue the bear case. Every substantive word on the book
is typed by the trader. No coins, entries, exits, or sizes are ever suggested.

## The session

One continuous take, five phases, the room getting more instrumented as
scrutiny increases, then exhaling:

1. **the window**, `what are we looking at?` Name a ticker (any of the 26
   chains Nansen indexes, Robinhood chain included) or trade a narrative.
   The desk resolves it against the tape and shows the deepest pool.
2. **present**, write the play in your own words. 25-word minimum; a
   headline isn't a thesis.
3. **clarify**, the clarifier asks one desk-head question at a time (four
   at most): narrative life-cycle, vehicle choice, timing, invalidation.
   Then it structures *your* words into a contract: claim, vehicle,
   narrative, assumptions (each with a verbatim "from your words"),
   invalidation, open questions. You can strike any line before signing.
4. **the board / challenge**, the analyst reads the tape and pins evidence
   to the assumptions it tests (supports / contradicts / inconclusive, exact
   figures only). The skeptic attacks the weakest line. Target-lock any node
   for its dossier.
5. **the ruling**, you rule on every line: `[ hold ]` (a contested hold
   needs a reason), `[ revise ]`, or `[ cut ]`. Answer open questions or
   leave them. Name what takes it off the book. Zero tokens spent here.
6. **on the book**, the doc: thesis after the tape, the ledger
   (`05 lines in · 04 held (1 against the tape) · 00 revised · 01 cut`),
   every line with its status and receipts. `[ copy a link ]`, the link *is*
   the doc, nothing is stored. `[ copy as markdown ]`.

A first visit runs the desk tour: the desk builds itself as you use it.

## How Nansen is used

Everything goes through `src/lib/nansen/adapter.ts` (server-only; the key
never reaches the client). Endpoints in play:

| endpoint | role |
|---|---|
| `POST /token-screener` | ticker → address + market data; fanned out across all 26 chains (5 per call), largest market wins; chain-native coins map to their wrapped spot market |
| `POST /smart-money/netflow` | sector-level smart-money flows (29 sectors), accumulation and distribution |
| `POST /tgm/flow-intelligence` | per-token flows by holder cohort: smart traders, whales, top PnL, public figures, fresh wallets |

A planner (Claude, low effort) maps the thesis to at most two sectors and two
symbols; evidence is gathered in parallel with per-dataset failure tolerance.
If the API is fully down the desk falls back to labeled fixtures, every card
says so. Non-crypto theses get an honest "inconclusive", never stretched data.

**Dexscreener** (public, keyless) supplies *where it trades*, the deepest
pool, DEX, liquidity, as context in the window only. Verdicts come from
Nansen alone.

## The agents

| agent | model | job | may author content? |
|---|---|---|---|
| clarifier | claude-opus-5 | Socratic questions; structures the trader's words | never |
| analyst | claude-opus-5 | evidence cards from the tape, figures verbatim | never |
| skeptic | claude-opus-5 | the bear case, ends in a question | never |

Guardrails on every route: zod validation, input caps, untrusted-data
wrapping, per-IP and daily rate limits, refusal handling, and server-side
bounding of everything the model returns (including a verbatim check on
every "from your words" quote).

## Docs

- `docs/DESIGN-BRIEF.md`, the locked design decisions, phase by phase
- `docs/PRD.md`, the original product spec
- `docs/DEMO.md`, the 90-second walkthrough

## Run

```bash
cp .env.example .env.local   # ANTHROPIC_API_KEY, NANSEN_API_KEY
npm install
npm run dev
```

Without `NANSEN_API_KEY` the desk runs on labeled fixtures.
