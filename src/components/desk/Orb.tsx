/* The eclipse as the desk's character: large, quiet, breathing, behind the
   panels. Never carries content, never gets a label. The wrapper owns the
   placement (the .orb rule in globals is position: relative, unlayered, and
   would win over a utility class on the same element). */
export default function Orb({ size = 520, className = "" }: { size?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute ${className}`} style={{ width: size, height: size, opacity: 0.055 }}>
      <span className="orb breathing block" style={{ width: size, height: size, ["--orb-blur" as string]: "30px" }}>
        <span className="orb-trail" />
        <span className="orb-core" />
      </span>
    </div>
  );
}
