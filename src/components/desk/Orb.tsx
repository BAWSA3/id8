/* The eclipse as the desk's character: large, quiet, breathing, behind the
   panels. Never carries content, never gets a label. */
export default function Orb({ size = 520, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`orb breathing pointer-events-none absolute ${className}`}
      style={{ width: size, height: size, opacity: 0.085, ["--orb-blur" as string]: "28px" }}
    >
      <span className="orb-trail" />
      <span className="orb-core" />
    </span>
  );
}
