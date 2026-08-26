import { PHASES } from "@/lib/session";

/* Whisper-weight top bar: wordmark, session, phase. Calm by default —
   instrument chrome returns in the deeper phases, not here. */
export default function TopBar({
  session,
  phase,
  onReset,
}: {
  session: string;
  phase: number;
  onReset?: () => void;
}) {
  return (
    <div className="relative z-20 mx-auto flex max-w-[1200px] flex-wrap items-baseline gap-[18px] px-12 pt-[34px]">
      <h1 className="m-0 text-xl font-bold leading-none tracking-[-.02em]">
        id<i className="font-light italic">8</i>
      </h1>
      <span className="font-mono text-[10px] uppercase tracking-[.16em] text-faint">{session}</span>
      <span className="ml-auto font-mono text-[10px] uppercase tracking-[.16em] text-muted">
        <b className="font-normal text-lock-deep">{PHASES[phase].toLowerCase()}</b>
        {" · "}
        <span className="tabular-nums">
          {String(phase + 1).padStart(2, "0")}/{String(PHASES.length).padStart(2, "0")}
        </span>
      </span>
      {onReset && (
        <button
          onClick={onReset}
          className="border border-line px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[.16em] text-muted transition-colors hover:border-bad hover:text-bad"
        >
          [ new session ]
        </button>
      )}
    </div>
  );
}
