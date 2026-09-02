import Session from "@/components/instrument/Session";

export default function Home() {
  return (
    <main>
      <Session />
      <footer className="relative z-20 mx-auto flex max-w-[1200px] flex-wrap justify-between gap-4 px-12 pb-7 pt-4 font-mono text-[9px] uppercase tracking-[.14em] text-faint">
        <span>id8 · thesis desk</span>
        <span>bawsa studio · 2026</span>
      </footer>
    </main>
  );
}
