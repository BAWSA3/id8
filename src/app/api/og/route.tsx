import { ImageResponse } from "next/og";
import { decodeDoc } from "@/lib/doc-server";
import { ledgerLine } from "@/lib/doc";

/* The share card: the thesis after the tape, the ledger, the invalidation.
   Same darkroom as the front-door card; the doc travels in the URL. */

export const dynamic = "force-dynamic";

const trim = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export async function GET(req: Request) {
  const d = new URL(req.url).searchParams.get("d") ?? undefined;
  const doc = decodeDoc(d);
  const size = { width: 1200, height: 630 };

  if (!doc) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a09", color: "#8b8678", fontSize: 28, letterSpacing: 6 }}>
          NOTHING ON THE BOOK
        </div>
      ),
      size
    );
  }

  const ledger = ledgerLine(doc).toUpperCase();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#0a0a09",
          color: "#e9e4d6",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ display: "flex", alignItems: "baseline", fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>
            id<span style={{ fontWeight: 300, fontStyle: "italic" }}>8</span>
            <span style={{ marginLeft: 26, fontSize: 18, fontWeight: 400, letterSpacing: 5, color: "#8b8678" }}>
              ON THE BOOK{doc.ticker ? ` · $${doc.ticker.toUpperCase()}` : ""}
            </span>
          </div>
          <div style={{ display: "flex", fontSize: 16, letterSpacing: 4, color: "#4e4b43" }}>{doc.at}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 15, letterSpacing: 5, color: "#4e4b43", marginBottom: 18 }}>THE THESIS, AFTER THE TAPE</div>
          <div style={{ display: "flex", fontSize: doc.claim.length > 140 ? 34 : 42, lineHeight: 1.25, fontWeight: 500, fontFamily: "sans-serif" }}>
            “{trim(doc.claim, 200)}”
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", fontSize: 17, letterSpacing: 2, color: "#e9e4d6" }}>{ledger}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", fontSize: 13, letterSpacing: 4, color: "#ff4b1f" }}>OFF THE BOOK IF</div>
            <div style={{ display: "flex", fontSize: 17, letterSpacing: 1, color: "#8b8678" }}>{trim(doc.invalidation, 100).toUpperCase()}</div>
          </div>
          <div style={{ display: "flex", marginTop: 10, fontSize: 14, letterSpacing: 4, color: "#4e4b43" }}>
            PRESSURE-TESTED ON ID8 · {doc.live ? "LIVE NANSEN TAPE" : "FIXTURE TAPE"} · WRITES YOUR TRADE: NEVER
          </div>
        </div>
      </div>
    ),
    size
  );
}
