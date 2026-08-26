# id8 — PRD v0.1

**One-liner:** id8 is a creative workspace where AI interrogates your idea instead of writing it — and live onchain data pushes back.

**Author:** Jeffrey (BAWSA) · **Drafted:** 2026-08-25
**Context:** Nansen API vibe coding challenge — comp runs Sept 14–30, 2026, $10k first prize. Built to win the comp *and* live on as a real product.

---

## 1. Thesis

The discourse says AI is making creators lazy — people prompt, paste, and ship
work they never actually thought through. id8 takes the opposite bet: **AI
should be a sparring partner, not a ghostwriter.**

Hard product rule (this is the brand): **id8 never authors your idea.**
Agents ask questions, structure *your* words, surface evidence, and challenge
weak points. The user does the creating. If a judge asks "did the AI write
this?", the answer is provably no — every substantive sentence in the output
doc was typed by the human.

The Nansen twist makes the thesis literal: you don't just get interrogated by
an AI, you get interrogated by **the chain**. You claim a narrative is heating
up — smart money flows say otherwise. You think your token thesis is early —
wallet labels show the funds already rotated in. Ideas grounded in evidence,
not vibes. ("Vibe coding, rigorous thinking.")

## 2. Audience

**V1 (comp + launch):** onchain thinkers — crypto founders shaping a product
thesis, researchers building a narrative/token thesis, CT creators constructing
a content angle before they write the thread.

**Later:** all creators and thinkers (the general id8 vision), plus a BrandOS
bridge (§8).

## 3. Core loop — guided spine, free edges

A session = one idea, walked through a phased journey. Each phase produces
artifacts that land on a canvas; the canvas and the doc are two views of the
same session.

### Phases (the spine)

1. **PRESENT** — user writes the raw idea in their own words. Minimum-effort
   gate: id8 won't proceed on a five-word prompt; the Clarifier pushes for a
   real articulation first.
2. **CLARIFY** — the Clarifier agent asks Socratic questions (who is this for,
   what's the claim, what would make it false). Answers become structured
   blocks: Problem, Claim/Thesis, Audience, Assumptions.
3. **CHALLENGE** — the Analyst agent pulls Nansen data relevant to the idea's
   claims and presents evidence *for and against*, each as an evidence card
   pinned to the assumption it supports or attacks. The Skeptic agent argues
   the bear case using that data. User responds — defend, revise, or concede —
   in their own words.
4. **STRUCTURE** — the idea map assembles: thesis at center, assumptions,
   evidence, open questions, and risks as connected nodes. User rearranges,
   merges, prunes.
5. **COMMIT** — output: a shareable one-pager (the doc) + the living map.
   Includes a "conviction ledger": what you believed at the start vs. what
   survived the data.

### Free edges

- The canvas is always accessible; users can leave the spine, rearrange nodes,
  spawn an agent chat on any node ("challenge this assumption again"), and
  return to the spine where they left off.
- Agents are summonable on demand, not only at their phase.

### Agents (v1: three, distinct personalities)

| Agent | Role | Nansen usage |
|---|---|---|
| **Clarifier** | Socratic questioning, extracts structure from user prose | none |
| **Analyst** | fetches + frames onchain evidence, neutral | heavy |
| **Skeptic** | argues against the idea using the Analyst's data | reads evidence cards |

All agents obey the no-ghostwriting rule: they output questions, evidence,
and critique — never draft copy for the user's idea.

## 4. The artifact — doc + map

- **Map = the workspace.** Nodes: thesis, assumptions, evidence cards (with
  Nansen data + timestamp + link), open questions, risks. Edges: supports /
  contradicts / depends-on.
- **Doc = the export.** Auto-assembled from the map into a clean one-pager:
  thesis, key assumptions with their evidence status
  (✅ supported / ⚠️ contested / ❌ refuted by data), conviction ledger, next
  steps. Exports as a public share link (and MD copy).
- Share links are the growth loop: "I pressure-tested my thesis on id8" is a
  natural CT post format.

## 5. Nansen integration (assumptions — verify when API access lands)

No docs access yet. Design against Nansen's known public surface and keep the
data layer behind an adapter so endpoint reality can shift under us:

- **Smart Money** — netflows by token/narrative → "is smart money actually
  buying your thesis?"
- **Wallet labels / profiler** — who holds, who's exiting → credibility of
  "early" claims.
- **Token God Mode** — holder breakdown, flows over time → evidence cards.
- **Narrative/sector momentum** (if exposed) — sector heat vs. the user's claim.

Build order: `NansenAdapter` interface → mock adapter with realistic fixture
data (build everything against this) → real adapter when keys arrive. This
also de-risks rate limits and demo-day API wobble (demo can fall back to
fixtures if the API dies mid-judging — clearly labeled, never silently).

**Open questions for the organizers** (ask when comp details land):
key/quota provisioning, whether pre-comp building is allowed, judging criteria,
whether the app must be deployed/public, IP ownership of entries.

## 6. Workspace-as-world (the UI/UX bet)

Customization *is* the world building: your workspace is a place you inhabit
and tune to your taste. This is the "well designed, fun" differentiator and
plays to the BAWSA terminal-OS design DNA.

- **V1 worlds:** 3–4 curated environments (e.g., terminal/OS, studio/paper,
  night-ops/dark) — each a full coordinated system: background, type, motion,
  sound-off/on, node styling. Not a color picker; a *vibe* picker.
- Per-world agent presentation (same brains, different skins/voice tone).
- World choice persists per user; the share-link doc inherits the world's look
  (branded, screenshot-worthy).
- **Later:** user-composed worlds, unlockables, BrandOS-informed defaults.

Design language: the BrandOS aesthetic lineage — VCR OSD Mono / JetBrains
Mono, Klein blue, film grain, ASCII/typescript motifs — as the flagship world,
with the others deliberately contrasting to prove customization is real.

## 7. Stack

- **Fresh repo** (`id8`), Next.js App Router + TypeScript on Vercel.
- **AI:** Vercel AI SDK via AI Gateway, Claude (Sonnet 5 default; Haiku 4.5
  for cheap clarifier turns if cost matters). Agent = system prompt + tools;
  no heavy framework needed for three agents.
- **Data:** Supabase (auth + Postgres w/ RLS — reuse BrandOS hardening
  patterns from day one, not retrofitted).
- **Canvas:** React Flow (`@xyflow/react`) for the idea map — proven, fast to
  ship, themeable per world.
- **Motion:** motion + Motion+ (token already provisioned for BAWSA projects).
- **Nansen:** server-side adapter only; key never touches the client.

## 8. BrandOS bridge (post-comp, design-for now)

- Shared Supabase auth namespace or SSO between products (decide at repo
  setup; don't block v1 on it).
- Future: BrandOS taste/archetype profile seeds id8 world defaults and agent
  tone; id8 session outputs ("my pressure-tested thesis") feed BrandOS
  content coaching. CT creators are the shared audience.
- Cross-funnel: id8 share-link footer → BrandOS scan, and vice versa.

## 9. Scope fences (v1 / comp build)

**In:** the full spine (5 phases), 3 agents, canvas + doc export, share links,
3 worlds, Nansen adapter (mock → real), Supabase auth (magic link only),
mobile-*readable* share pages (creation is desktop-first).

**Out (post-comp):** billing/tiers, teams/multiplayer, user-composed worlds,
narrative-worldbuilding use case, BrandOS integration, mobile creation,
more agents, template library.

## 10. Judging/demo strategy

- **The 15-second story:** "Everyone's worried AI does the thinking for you.
  id8 is the opposite — you bring the idea, and our agents plus Nansen's data
  interrogate it until it's sharp. AI never writes a word of your idea."
- Demo arc: paste a hot-but-lazy take → Clarifier exposes it's mush → Analyst
  pulls smart-money data that contradicts it → user revises live → map
  assembles → shareable doc with conviction ledger. One continuous take,
  ~3 minutes.
- Why it wins: featured (not decorative) API usage, a thesis judges can
  retell, and a UI that screenshots well. The share link doubles as
  distribution for Nansen — their data, visibly doing work, in public posts.

## 11. Timeline (comp: Sept 14–30)

**Now → Sept 13 (prep, pending rules check on pre-building):** finalize PRD,
design worlds (Figma or code sketches), fixture datasets, repo scaffold if
allowed. **Sept 14–20:** spine + agents + mock adapter + world 1.
**Sept 21–26:** real Nansen adapter, canvas polish, worlds 2–3, doc export +
share links. **Sept 27–29:** demo recording, deploy hardening, buffer.
**Sept 30:** winner announced.

## 12. Open questions

1. Comp logistics: rules, judging criteria, API provisioning, pre-build policy.
2. Nansen endpoint reality vs. §5 assumptions.
3. Name/domain: id8.app availability (check early; alternates: id8.studio,
   useid8.com).
4. How hard is the minimum-effort gate in PRESENT? (Too strict = demo
   friction; too loose = thesis undermined.)
5. Does the Skeptic need a user-facing "intensity" dial? (Fun customization
   surface; scope risk.)
