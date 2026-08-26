import { PHASES } from "@/lib/session";

/* Wordmark + session id + phase transport (media chrome). */
export default function TopBar({
  session,
  phase,
  onReset,
}: {
  session: string;
  phase: number;
  onReset?: () => void;
}) {
  const pct = ((phase + 0.5) / PHASES.length) * 100;
  return (
    <div className="relative z-20 mx-auto flex max-w-[1440px] flex-wrap items-center gap-[18px] px-10 pt-6">
      <h1 className="m-0 origin-left scale-x-110 text-[26px] font-black leading-none tracking-[-.03em]">id8</h1>
      <span className="font-mono text-[10px] uppercase tracking-[.16em] text-muted">{session}</span>
      <div className="ml-auto flex items-center gap-3 whitespace-nowrap font-mono text-[11px] tracking-[.14em]">
        <span><span className="text-lock">■ </span>{PHASES[phase].toUpperCase()}</span>
        <span className="relative h-px w-24 bg-line">
          <span className="absolute left-0 top-0 h-px bg-ink" style={{ width: `${pct}%` }} />
          <span className="absolute -top-[2.5px] size-1.5 rounded-full bg-lock" style={{ left: `${pct}%` }} />
        </span>
        <span className="tabular-nums text-muted">
          {String(phase + 1).padStart(2, "0")}/{String(PHASES.length).padStart(2, "0")}
        </span>
        {onReset && (
          <button
            onClick={onReset}
            className="border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.16em] text-muted hover:border-bad hover:text-bad"
          >
            [ new session ]
          </button>
        )}
      </div>
    </div>
  );
}
