/* The index band: the poster surfaces' bottom line. Plate letter, the live dot,
   the plate number in the pixel face, two-line labels either side, a module glyph
   in the middle on wide screens. Tiny on purpose; the emptiness above it is the design. */

export default function IndexBand({
  plate = "1",
  left,
  right,
  tail,
  module = true,
  className = "",
}: {
  plate?: string;
  left: [string, string];
  right: [string, string];
  tail?: string;
  module?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between font-mono text-[10px] uppercase tracking-[.16em] text-muted ${className}`}>
      <div className="flex items-center gap-3.5 whitespace-nowrap">
        <span>A/</span>
        <span className="inline-flex gap-1">
          <i className="block size-[7px] rounded-full bg-lock" />
          <i className="block size-[7px] rounded-full bg-ink" />
        </span>
        <span className="font-pixel text-[11px] text-ink">{plate}</span>
        <span className="flex flex-col gap-0.5 text-[8.5px] leading-[1.15] text-faint">
          <span>{left[0]}</span>
          <span>{left[1]}</span>
        </span>
      </div>
      {module && (
        <div className="hidden items-center gap-1.5 md:inline-flex" aria-hidden="true">
          <b className="block h-[9px] w-[22px] bg-ink opacity-90" />
          <span className="grid grid-cols-6 gap-[2px]">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} className="block size-[3px] bg-muted" />
            ))}
          </span>
        </div>
      )}
      <div className="hidden items-center gap-3.5 whitespace-nowrap sm:flex">
        <span className="flex flex-col gap-0.5 text-right text-[8.5px] leading-[1.15] text-faint">
          <span>{right[0]}</span>
          <span>{right[1]}</span>
        </span>
        {tail && <span className="hidden sm:inline">{tail}</span>}
      </div>
    </div>
  );
}
