import "server-only";

/* NansenAdapter — the seam between id8 and the Nansen API.
   Server-only: the API key must never reach the browser.
   Live primitives (verified against api.nansen.ai 2026-09-01):
   - smart-money netflows (sector-filterable, token-level rows)
   - token resolution via token-screener (symbol → address + market data)
   - flow intelligence (per-token flows by holder segment)
   The mock stays as the labeled fallback if the live API wobbles during
   judging — always labeled "fixture", never silent. */

const BASE = "https://api.nansen.ai/api/v1";
const TIMEOUT_MS = 12_000;

/* Sector vocabulary sampled from live netflow data 2026-09-01 — the API has
   no sectors reference endpoint, and unknown names silently return []. */
export const NANSEN_SECTORS = [
  "AI Agents",
  "AI Meme",
  "Artificial Intelligence",
  "Crypto Payments",
  "Data source and Oracle",
  "DeFi Lending (Money Markets)",
  "DeFi Tools",
  "DePIN",
  "DeSci",
  "Decentralised Exchanges",
  "GambleFi",
  "GameFi",
  "L1/L2 Token & Derivatives",
  "Liquidity Management",
  "Market Analysis",
  "Memecoins",
  "Metaverse",
  "NFTFi",
  "NFTs",
  "On-Chain Analytics",
  "Perps, Options and Derivatives",
  "RWAs",
  "Restaking",
  "Scaling & Connectivity",
  "Social Fi",
  "Stablecoin Issuers",
  "Tokenized Stocks",
  "Yield Bearing",
  "Yield Farming Protocols",
] as const;
export type NansenSector = (typeof NANSEN_SECTORS)[number];

export interface NetflowRow {
  tokenSymbol: string;
  chain: string;
  sectors: string[];
  netflow24hUsd: number;
  netflow7dUsd: number;
  netflow30dUsd: number;
  smartTraderCount: number;
  marketCapUsd: number;
}

export interface TokenMarket {
  symbol: string;
  chain: string;
  address: string;
  priceUsd: number;
  priceChangePct: number;
  marketCapUsd: number;
  liquidityUsd: number;
  volumeUsd7d: number;
  netflowUsd7d: number;
  tokenAgeDays: number;
}

export interface TokenSegmentFlows {
  symbol: string;
  chain: string;
  windowDays: number;
  whaleNetFlowUsd: number;
  whaleWalletCount: number;
  smartTraderNetFlowUsd: number;
  smartTraderWalletCount: number;
  publicFigureNetFlowUsd: number;
  publicFigureWalletCount: number;
  topPnlNetFlowUsd: number;
  topPnlWalletCount: number;
  exchangeNetFlowUsd: number;
  freshWalletsNetFlowUsd: number;
}

export interface NansenAdapter {
  /* true while serving fixtures — surfaces as "fixture data" labels in the UI */
  readonly isMock: boolean;
  /* Token-level smart money flows, optionally filtered to sectors.
     "accumulating" = largest 7d inflows first; "distributing" = largest outflows. */
  smartMoneyNetflows(opts: {
    sectors?: string[];
    direction: "accumulating" | "distributing";
    limit?: number;
  }): Promise<NetflowRow[]>;
  /* Symbol → best-match token with market data, or null if unknown. */
  resolveToken(symbol: string): Promise<TokenMarket | null>;
  /* Per-segment 7d flows for a resolved token. */
  tokenSegmentFlows(token: TokenMarket): Promise<TokenSegmentFlows | null>;
}

/* ---------- live ---------- */

async function nansenPost(path: string, body: unknown): Promise<unknown> {
  const key = process.env.NANSEN_API_KEY;
  if (!key) throw new Error("NANSEN_API_KEY missing");
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`nansen ${path} ${res.status}`);
  return res.json();
}

type Raw = Record<string, unknown>;
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
/* USD amounts arrive as long floats; round at the boundary so the Analyst's
   verbatim-figures rule quotes readable numbers on evidence cards. */
const usd = (v: unknown): number => Math.round(num(v));
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/* Every chain the token-screener accepts (422 lists them; "all" is rejected there).
   Sampled live 2026-09-03. Robinhood chain carries tokenized equities (NVDA, SPY). */
export const NANSEN_CHAINS = [
  "ethereum", "solana", "base", "bnb", "arbitrum",
  "hyperevm", "monad", "robinhood", "plasma", "polygon",
  "avalanche", "optimism", "sonic", "sui", "ton",
  "tron", "linea", "mantle", "sei", "near",
  "injective", "mantra", "iotaevm", "starknet", "citrea", "bitcoin",
] as const;

/* Chain-native coins don't sit on the spot tape under their own symbol — the
   wrapped token on the home chain is the market. Verified live 2026-09-03;
   ETH/SOL are excluded by the screener's native filter and stay unresolved. */
const NATIVE_ALIASES: Record<string, { symbol: string; chain: string }> = {
  HYPE: { symbol: "WHYPE", chain: "hyperevm" },
  MON: { symbol: "WMON", chain: "monad" },
  BNB: { symbol: "WBNB", chain: "bnb" },
  AVAX: { symbol: "WAVAX", chain: "avalanche" },
  TRX: { symbol: "WTRX", chain: "tron" },
  XPL: { symbol: "WXPL", chain: "plasma" },
};

export class LiveNansenAdapter implements NansenAdapter {
  readonly isMock = false;

  async smartMoneyNetflows(opts: {
    sectors?: string[];
    direction: "accumulating" | "distributing";
    limit?: number;
  }): Promise<NetflowRow[]> {
    const json = (await nansenPost("/smart-money/netflow", {
      chains: ["all"],
      ...(opts.sectors?.length ? { filters: { token_sector: opts.sectors } } : {}),
      order_by: [
        { field: "net_flow_7d_usd", direction: opts.direction === "accumulating" ? "DESC" : "ASC" },
      ],
      pagination: { page: 1, per_page: opts.limit ?? 8 },
    })) as { data?: Raw[] };
    return (json.data ?? []).map((r) => ({
      tokenSymbol: str(r.token_symbol),
      chain: str(r.chain),
      sectors: Array.isArray(r.token_sectors) ? r.token_sectors.map(String) : [],
      netflow24hUsd: usd(r.net_flow_24h_usd),
      netflow7dUsd: usd(r.net_flow_7d_usd),
      netflow30dUsd: usd(r.net_flow_30d_usd),
      smartTraderCount: num(r.trader_count),
      marketCapUsd: usd(r.market_cap_usd),
    }));
  }

  async resolveToken(symbol: string): Promise<TokenMarket | null> {
    /* the screener takes at most 5 chains per call — fan out across every chain
       Nansen indexes, tolerate per-batch failures, take the largest market */
    const alias = NATIVE_ALIASES[symbol];
    const batches: string[][] = [];
    if (alias) batches.push([alias.chain]);
    else for (let i = 0; i < NANSEN_CHAINS.length; i += 5) batches.push(NANSEN_CHAINS.slice(i, i + 5));
    const settled = await Promise.allSettled(
      batches.map((chains) =>
        nansenPost("/token-screener", {
          chains,
          timeframe: "7d",
          filters: { token_symbol: [alias ? alias.symbol : symbol] },
          order_by: [{ field: "market_cap_usd", direction: "DESC" }],
          pagination: { page: 1, per_page: 3 },
        }) as Promise<{ data?: Raw[] }>
      )
    );
    const rows = settled.flatMap((r) => (r.status === "fulfilled" ? r.value.data ?? [] : []));
    if (!rows.length) {
      if (settled.every((r) => r.status === "rejected")) {
        throw (settled[0] as PromiseRejectedResult).reason;
      }
      return null;
    }
    const r = rows.sort((a, b) => num(b.market_cap_usd) - num(a.market_cap_usd))[0];
    return {
      symbol: str(r.token_symbol),
      chain: str(r.chain),
      address: str(r.token_address),
      priceUsd: num(r.price_usd),
      priceChangePct: num(r.price_change),
      marketCapUsd: usd(r.market_cap_usd),
      liquidityUsd: usd(r.liquidity),
      volumeUsd7d: usd(r.volume),
      netflowUsd7d: usd(r.netflow),
      tokenAgeDays: Math.round(num(r.token_age_days)),
    };
  }

  async tokenSegmentFlows(token: TokenMarket): Promise<TokenSegmentFlows | null> {
    const json = (await nansenPost("/tgm/flow-intelligence", {
      chain: token.chain,
      token_address: token.address,
      timeframe: "7d",
    })) as { data?: Raw[] };
    const r = json.data?.[0];
    if (!r) return null;
    return {
      symbol: token.symbol,
      chain: token.chain,
      windowDays: 7,
      whaleNetFlowUsd: usd(r.whale_net_flow_usd),
      whaleWalletCount: num(r.whale_wallet_count),
      smartTraderNetFlowUsd: usd(r.smart_trader_net_flow_usd),
      smartTraderWalletCount: num(r.smart_trader_wallet_count),
      publicFigureNetFlowUsd: usd(r.public_figure_net_flow_usd),
      publicFigureWalletCount: num(r.public_figure_wallet_count),
      topPnlNetFlowUsd: usd(r.top_pnl_net_flow_usd),
      topPnlWalletCount: num(r.top_pnl_wallet_count),
      exchangeNetFlowUsd: usd(r.exchange_net_flow_usd),
      freshWalletsNetFlowUsd: usd(r.fresh_wallets_net_flow_usd),
    };
  }
}

/* ---------- mock ---------- */

/* Fixture data — realistic shapes for demo + development, and the fallback
   if the live API wobbles during judging (always labeled, never silent). */
export class MockNansenAdapter implements NansenAdapter {
  readonly isMock = true;

  async smartMoneyNetflows(opts: {
    sectors?: string[];
    direction: "accumulating" | "distributing";
    limit?: number;
  }): Promise<NetflowRow[]> {
    const sign = opts.direction === "accumulating" ? 1 : -1;
    return [
      {
        tokenSymbol: "SYRUP",
        chain: "ethereum",
        sectors: opts.sectors ?? ["DeFi Lending (Money Markets)"],
        netflow24hUsd: sign * 130_172,
        netflow7dUsd: sign * 1_358_714,
        netflow30dUsd: sign * 515_342,
        smartTraderCount: 4,
        marketCapUsd: 220_219_488,
      },
      {
        tokenSymbol: "PUMP",
        chain: "solana",
        sectors: opts.sectors ?? ["Memecoins"],
        netflow24hUsd: sign * -264_471,
        netflow7dUsd: sign * 561_694,
        netflow30dUsd: sign * 6_334_924,
        smartTraderCount: 67,
        marketCapUsd: 1_668_421_988,
      },
    ];
  }

  async resolveToken(symbol: string): Promise<TokenMarket | null> {
    return {
      symbol: symbol.toUpperCase(),
      chain: "solana",
      address: "fixture000000000000000000000000000000000000",
      priceUsd: 0.0042,
      priceChangePct: -0.105,
      marketCapUsd: 1_668_421_988,
      liquidityUsd: 17_979_920,
      volumeUsd7d: 289_707_310,
      netflowUsd7d: -3_649_190,
      tokenAgeDays: 419,
    };
  }

  async tokenSegmentFlows(token: TokenMarket): Promise<TokenSegmentFlows | null> {
    return {
      symbol: token.symbol,
      chain: token.chain,
      windowDays: 7,
      whaleNetFlowUsd: -709_311,
      whaleWalletCount: 17,
      smartTraderNetFlowUsd: 561_694,
      smartTraderWalletCount: 26,
      publicFigureNetFlowUsd: 1_222_787,
      publicFigureWalletCount: 45,
      topPnlNetFlowUsd: -4_260_560,
      topPnlWalletCount: 68,
      exchangeNetFlowUsd: 702_758,
      freshWalletsNetFlowUsd: 2_987_046,
    };
  }
}

export function getNansenAdapter(): NansenAdapter {
  return process.env.NANSEN_API_KEY ? new LiveNansenAdapter() : new MockNansenAdapter();
}
