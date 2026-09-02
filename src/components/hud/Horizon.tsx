/* The dithered horizon — pure atmosphere for the door and the calm pages:
   a posterized glow rising from the floor with a dithered edge, and a
   hairline floor-line. A stage in a dark room; never carries content.
   The cockpit keeps its own board and doesn't use this. */
export default function Horizon({ fixed = false }: { fixed?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`horizon pointer-events-none ${fixed ? "fixed" : "absolute"} inset-x-0 bottom-0 -z-[1] h-[46vh] overflow-hidden`}
    >
      <span className="horizon-line" />
    </div>
  );
}
