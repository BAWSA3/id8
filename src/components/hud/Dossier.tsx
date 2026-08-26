import type { Dossier as DossierData, TagTone } from "@/lib/session";
import Panel from "./Panel";

const TONE: Record<TagTone, string> = {
  lock: "text-lock",
  ok: "text-good",
  contested: "text-bad",
  neutral: "text-muted",
};

/* Target-locked node detail panel. */
export default function Dossier({ data }: { data: DossierData }) {
  return (
    <Panel label="target lock" className="right-10 top-8 w-[296px] max-h-[66%] overflow-y-auto">
      <h3 className="m-0 mb-1 font-mono text-xs uppercase tracking-[.14em]">{data.title}</h3>
      <p className="m-0 mb-3 font-mono text-[10px] uppercase tracking-[.1em] text-muted">{data.sub}</p>
      <span className={`mb-2.5 inline-block border border-current px-[7px] py-[2px] font-mono text-[9px] uppercase tracking-[.14em] ${TONE[data.tag.tone]}`}>
        {data.tag.label}
      </span>
      <div className="text-[13px] leading-relaxed">
        {data.body.map((p) => (
          <p key={p.slice(0, 24)} className="m-0 mb-2.5 last:mb-0">{p}</p>
        ))}
      </div>
      {data.rows?.map((r) => (
        <div key={r.k} className="flex items-baseline gap-2.5 border-t border-line py-[7px]">
          <span className="font-mono text-[10px] uppercase tracking-[.1em] text-muted">{r.k}</span>
          <span className={`ml-auto font-mono text-[13px] font-bold tabular-nums ${r.dir === "neg" ? "text-bad" : r.dir === "pos" ? "text-good" : ""}`}>
            {r.v}
          </span>
        </div>
      ))}
    </Panel>
  );
}
