"use client";

/* The film's last frame: the eclipse as a body, the mark beneath it, the site, the index band. */

import Stone from "@/components/matter/Stone";
import Grain from "@/components/matter/Grain";
import IndexBand from "@/components/hud/IndexBand";

export default function EndCard({ show, site }: { show: boolean; site: string }) {
  return (
    <div
      className={`fixed inset-0 z-[80] overflow-hidden bg-bg transition-opacity duration-[1200ms] ${show ? "opacity-100" : "pointer-events-none opacity-0"}`}
      aria-hidden={!show}
    >
      <Stone pose={{ anchor: [0.5, 0.33], radius: 0.17 }} portrait={{ anchor: [0.5, 0.28], radius: 0.4 }} />
      <Grain strength={0.42} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pt-[32vh] text-center">
        <h1 className="m-0 text-[clamp(40px,5vw,72px)] font-bold leading-none tracking-[-.03em]">
          id<i className="font-light italic">8</i>
        </h1>
        <p className="m-0 font-mono text-[11px] uppercase tracking-[.26em] text-muted">a canvas for your thesis</p>
        <p className="m-0 mt-5 font-mono text-[12px] tracking-[.22em] text-ink">
          <span className="mr-3 inline-block size-[7px] rounded-full bg-lock align-[1px]" />
          {site}
        </p>
      </div>
      <IndexBand className="absolute inset-x-[5vw] bottom-[5vh]" left={["thesis desk", "end of plate"]} right={["built on the nansen api", "never writes your trade"]} />
    </div>
  );
}
