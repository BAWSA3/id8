"use client";

import type { Play } from "@/lib/desk";
import type { WatchRead } from "@/lib/watch";
import Panel from "@/components/hud/Panel";

const usd = (n: number) => `${n < 0 ? "-" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
const price = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 1 ? 6 : 2 })}`;
const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
};
const Row = ({ k, v, dir }: { k: string; v: string; dir?: "pos" | "neg" }) => (
  <div className="flex items-baseline gap-2.5 border-t border-line py-[6px]">
    <span className="font-mono text-[9.5px] uppercase tracking-[.1em] text-muted">{k}</span>
    <span className={`ml-auto font-mono text-[12px] font-bold tabular-nums ${dir === "neg" ? "text-bad" : dir === "pos" ? "text-good" : "text-ink"}`}>{v}</span>
  </div>
);
const sign = (n: number): "pos" | "neg" | undefined => (n > 0 ? "pos" : n < 0 ? "neg" : undefined);

/* The token, live: the vehicle as the tape reads it now. A narrative play
   shows its sector instead. */
export default function TokenPanel({ play, read, state }: { play: Play | null; read: WatchRead | null; state?: "reading" | "done" | "error" }) {
  if (!play) {
    return (
      <Panel label="the token" className="!static">
        <p className="m-0 font-mono text-[11px] text-faint">no vehicle on the book.</p>
      </Panel>
    );
  }
  const t = read?.token ?? null;
  const s = read?.sector ?? null;
  const stamp = read ? `${read.live ? "live" : "fixture"} · ${ago(read.readAt)}` : state === "error" ? "the tape hiccupped" : "reading the tape";
  return (
    <Panel label="the token" labelRight={t?.chain ?? play.chain ?? ""} className="!static">
      <p className="m-0 font-mono text-[15px] text-ink">{play.ticker ? `$${play.ticker}` : s ? s.sector : "a narrative, not a name"}</p>
      <p className="m-0 mt-1 mb-3 font-mono text-[9.5px] uppercase tracking-[.12em] text-faint">
        {read?.live && <span className="seed mr-1.5 inline-block align-[1px]" style={{ width: 5, height: 5 }} />}
        {stamp}
        {!read && state !== "error" && <span className="blink ml-1" />}
      </p>
      {t && (
        <div>
          <Row k="price" v={price(t.priceUsd)} />
          <Row k="7d" v={`${t.priceChangePct > 0 ? "+" : ""}${t.priceChangePct.toFixed(2)}%`} dir={sign(t.priceChangePct)} />
          <Row k="mcap" v={usd(t.marketCapUsd)} />
          {t.pool && <Row k={`${t.pool.pair} · ${t.pool.dex}${t.pool.version ? ` ${t.pool.version}`: ""}`} v={`${usd(t.pool.liquidityUsd)} liq`} />}
          {t.pool && <Row k="pool 24h" v={usd(t.pool.volume24hUsd)} />}
          {t.flows && <Row k="smart trader 7d" v={usd(t.flows.smartTraderNetFlowUsd)} dir={sign(t.flows.smartTraderNetFlowUsd)} />}
          {t.flows && <Row k="whales 7d" v={usd(t.flows.whaleNetFlowUsd)} dir={sign(t.flows.whaleNetFlowUsd)} />}
          {t.flows && <Row k="top pnl 7d" v={usd(t.flows.topPnlNetFlowUsd)} dir={sign(t.flows.topPnlNetFlowUsd)} />}
          {t.flows && <Row k="fresh wallets 7d" v={usd(t.flows.freshWalletsNetFlowUsd)} dir={sign(t.flows.freshWalletsNetFlowUsd)} />}
        </div>
      )}
      {!t && s && (
        <div>
          <Row k="sector 7d" v={usd(s.netflow7dUsd)} dir={sign(s.netflow7dUsd)} />
          {s.accumulating.slice(0, 3).map((r) => (
            <Row key={`a${r.symbol}${r.chain}`} k={`${r.symbol} · in`} v={usd(r.netflow7dUsd)} dir="pos" />
          ))}
          {s.distributing.slice(0, 3).map((r) => (
            <Row key={`d${r.symbol}${r.chain}`} k={`${r.symbol} · out`} v={usd(r.netflow7dUsd)} dir="neg" />
          ))}
        </div>
      )}
      {read && !t && !s && <p className="m-0 font-mono text-[10px] text-faint">the tape has no market for this play.</p>}
    </Panel>
  );
}
