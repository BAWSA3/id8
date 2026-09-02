"use client";

import TypeLine from "./TypeLine";

/* The desk's tutorial voice — one mono caption at the bottom of the room.
   The desk explains furniture in deadpan; the agents never explain anything.
   [ skip the tour ] is always present while the desk is teaching. */
export default function DeskCaption({
  text,
  onSkip,
}: {
  text: string;
  onSkip: () => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[55] flex w-[min(92vw,620px)] -translate-x-1/2 flex-col items-start gap-1.5 px-2">
      <div className="pixel-box pointer-events-auto w-full border border-line px-4 py-3" style={{ background: "var(--bg)" }}>
        <TypeLine key={text} prefix="the desk" prefixClass="font-pixel text-[10px] text-muted" text={text} />
      </div>
      <button
        onClick={onSkip}
        className="pointer-events-auto border-0 bg-transparent p-0 font-mono text-[9px] uppercase tracking-[.18em] text-faint transition-colors hover:text-muted focus-visible:text-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lock"
      >
        [ skip the tour ]
      </button>
    </div>
  );
}
