import type { CSSProperties, ReactNode } from "react";

/* HUD panel with target-lock corner brackets. */
export default function Panel({
  label,
  labelRight,
  className = "",
  style,
  children,
}: {
  label?: string;
  labelRight?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <section className={`hud ${className}`} style={style}>
      <i className="corner c1" /><i className="corner c2" /><i className="corner c3" /><i className="corner c4" />
      {label && (
        <p className="hud-label">
          <span>{label}</span>
          {labelRight && <span>{labelRight}</span>}
        </p>
      )}
      {children}
    </section>
  );
}
