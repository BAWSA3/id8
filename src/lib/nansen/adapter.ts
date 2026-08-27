/* NansenAdapter — the seam between id8 and the Nansen API.
   Server-only: never import from client components; the API key must not
   reach the browser. Everything is built against the mock until comp API
   access lands; endpoint shapes are assumptions to verify against real docs. */

export interface SmartMoneyNetflow {
  sector: string;
  windowDays: number;
  netflowUsd: number;
  top100Reducing: number;
  subsets: { name: string; netflowUsd: number; tokenCount: number }[];
  fetchedAt: string;
}

export interface SocialVolume {
  sector: string;
  changePct: number;
  vsLabel: string;
}

export interface NansenAdapter {
  /* true while serving fixtures — surfaces as "fixture data" labels in the UI */
  readonly isMock: boolean;
  smartMoneyNetflow(sector: string, windowDays: number): Promise<SmartMoneyNetflow>;
  socialVolume(sector: string): Promise<SocialVolume>;
}

/* Fixture data — realistic shapes for demo + development.
   Also the fallback if the live API wobbles during judging (always labeled, never silent). */
export class MockNansenAdapter implements NansenAdapter {
  readonly isMock = true;

  async smartMoneyNetflow(sector: string, windowDays: number): Promise<SmartMoneyNetflow> {
    return {
      sector,
      windowDays,
      netflowUsd: -41_700_000,
      top100Reducing: 62,
      subsets: [{ name: "infra", netflowUsd: 8_200_000, tokenCount: 3 }],
      fetchedAt: "2026-08-25T14:32:00Z",
    };
  }

  async socialVolume(sector: string): Promise<SocialVolume> {
    return { sector, changePct: -71, vsLabel: "Q1 peak" };
  }
}

/* Swap in the real adapter when API access lands:
   export class LiveNansenAdapter implements NansenAdapter { ... }
   reading NANSEN_API_KEY from server env only. */
export function getNansenAdapter(): NansenAdapter {
  return new MockNansenAdapter();
}
