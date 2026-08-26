import Session from "@/components/instrument/Session";

export default function Home() {
  return (
    <main>
      <Session />
      <footer className="relative z-20 mx-auto flex max-w-[1440px] flex-wrap justify-between gap-4 px-10 pb-6 pt-2.5 font-mono text-[10px] uppercase tracking-[.14em] text-faint">
        <span>id8 · cockpit</span>
        <span>bawsa studio · darkroom</span>
      </footer>
    </main>
  );
}
