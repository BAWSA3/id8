# id8

**You think. We interrogate.**

A creative workspace where AI interrogates your idea instead of writing it —
and live onchain data pushes back. Built for the Nansen API vibe coding
challenge (Sept 14–30, 2026); meant to live on after it.

The hard rule: **id8 never authors your idea.** Agents ask questions, surface
evidence, and argue the bear case. Every substantive word of the output is
typed by the human.

## Docs

- `docs/PRD.md` — full product spec (phases, agents, Nansen integration, scope fences)
- `docs/worlds-demo.html` — the design exploration that produced the Darkroom/Cockpit direction (v0.1–v0.4)

## Architecture notes

- **Design system:** "Darkroom" — tokens in `src/app/globals.css` (near-black,
  cream, acid `--lock` accent, JetBrains Mono + heavy grotesk).
- **Flagship composition:** "Cockpit" (`src/components/instrument/Cockpit.tsx`) —
  canvas constellation center stage, HUD panels floating around it.
- **Nansen:** everything goes through `src/lib/nansen/adapter.ts` (server-only;
  the API key never reaches the client). `MockNansenAdapter` fixtures until
  comp API access lands — also the labeled fallback if the live API wobbles.

## Run

```bash
npm run dev
```
