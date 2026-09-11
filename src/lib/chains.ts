/* Every chain the tape covers. Client-safe: the window's chain filter reads it,
   the server-only adapter re-exports it. Sampled live 2026-09-03. */

export const NANSEN_CHAINS = [
  "ethereum", "solana", "base", "bnb", "arbitrum",
  "hyperevm", "monad", "robinhood", "plasma", "polygon",
  "avalanche", "optimism", "sonic", "sui", "ton",
  "tron", "linea", "mantle", "sei", "near",
  "injective", "mantra", "iotaevm", "starknet", "citrea", "bitcoin",
] as const;
export type NansenChain = (typeof NANSEN_CHAINS)[number];

/* the chains a trader reaches for first; the rest sit under "other chains" */
export const CURATED_CHAINS: NansenChain[] = ["solana", "ethereum", "base", "bnb", "robinhood", "hyperevm", "arbitrum"];
export const OTHER_CHAINS: NansenChain[] = NANSEN_CHAINS.filter((c) => !CURATED_CHAINS.includes(c)).sort();
