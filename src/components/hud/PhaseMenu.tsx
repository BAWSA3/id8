import { PHASES, ACTIVE_PHASE } from "@/lib/session";
import Panel from "./Panel";

/* Phase list with bracket-select hover states. */
export default function PhaseMenu() {
  return (
    <Panel label="phases" className="left-10 top-8 w-[200px]">
      <nav aria-label="Phases">
        {PHASES.map((p, i) => {
          const state = i < ACTIVE_PHASE ? "done" : i === ACTIVE_PHASE ? "active" : "todo";
          return (
            <button
              key={p}
              className={`group flex w-full items-center gap-2.5 border px-2.5 py-2 text-left font-mono text-[11px] uppercase tracking-[.12em]
                ${state === "active" ? "border-lock text-lock" : "border-transparent"}
                ${state === "done" ? "text-muted" : state === "todo" ? "text-faint hover:text-ink" : ""}`}
            >
              <span className={`font-bold text-lock ${state === "active" ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>[</span>
              {String(i + 1).padStart(2, "0")} {p}
              <span className={`font-bold text-lock ${state === "active" ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>]</span>
              {state === "done" && <span className="ml-auto text-[10px] text-good">✓</span>}
            </button>
          );
        })}
      </nav>
    </Panel>
  );
}
