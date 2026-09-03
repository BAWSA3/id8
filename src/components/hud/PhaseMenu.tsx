import { PHASES } from "@/lib/session";
import Panel from "./Panel";

/* Phase spine. Only the live phase wears brackets; phases not yet built don't invite a click. */
export default function PhaseMenu({ activePhase }: { activePhase: number }) {
  return (
    <Panel label="phases" className="left-10 top-8 w-[212px]">
      <nav aria-label="Phases">
        {PHASES.map((p, i) => {
          const state = i < activePhase ? "done" : i === activePhase ? "active" : "todo";
          return (
            <button
              key={p}
              disabled={state === "todo"}
              aria-current={state === "active" ? "step" : undefined}
              className={`group flex w-full items-center gap-2.5 border px-2.5 py-1.5 text-left font-mono text-[10.5px] uppercase tracking-[.12em]
                ${state === "active" ? "border-lock text-lock" : "border-transparent"}
                ${state === "done" ? "text-muted" : state === "todo" ? "cursor-default text-faint" : ""}`}
            >
              <span className={`font-bold text-lock ${state === "active" ? "opacity-100" : "opacity-0"}`}>[</span>
              <span className="whitespace-nowrap">{String(i + 1).padStart(2, "0")} {p}</span>
              <span className={`font-bold text-lock ${state === "active" ? "opacity-100" : "opacity-0"}`}>]</span>
              {state === "done" && <span className="ml-auto text-[10px] text-good">✓</span>}
            </button>
          );
        })}
      </nav>
    </Panel>
  );
}
