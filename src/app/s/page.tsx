import type { Metadata } from "next";
import Link from "next/link";
import { decodeDoc } from "@/lib/doc-server";
import { ledgerLine } from "@/lib/doc";
import DocView from "@/components/desk/DocView";

/* The doc, shared. A quiet page: the thesis after the tape, the ledger,
   every line with its status and its receipts. Readable on a phone,
   readable without JS. The link carries the whole doc — nothing stored. */

export const dynamic = "force-dynamic";

type Search = Promise<{ d?: string }>;

const trim = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const { d } = await searchParams;
  const doc = decodeDoc(d);
  if (!doc) return { title: "id8 · nothing on the book at this link" };
  const title = `${doc.ticker ? `$${doc.ticker} · ` : ""}${trim(doc.claim, 80)}`;
  const description = `${ledgerLine(doc)} · off the book if: ${trim(doc.invalidation, 90)} · pressure-tested on id8`;
  const og = `/api/og?d=${encodeURIComponent(d!)}`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article", images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [og] },
  };
}


export default async function SharePage({ searchParams }: { searchParams: Search }) {
  const { d } = await searchParams;
  const doc = decodeDoc(d);

  if (!doc) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-[660px] flex-col justify-center px-8">
        <p className="m-0 font-mono text-[12.5px] text-muted">
          <span className="font-pixel text-[10px]">the desk ›</span> nothing on the book at this link.
        </p>
        <Link href="/" className="mt-6 font-mono text-[10.5px] uppercase tracking-[.18em] text-lock-deep hover:text-lock">
          [ open the desk ]
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[660px] flex-col px-6 pb-16 pt-[8vh] sm:px-8">
      <p className="m-0 mb-[26px] flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[.22em] text-muted">
        <span>
          <span className="seed mr-2.5 align-[1px]" />
          on the book{doc.ticker ? ` · $${doc.ticker}` : ""}
        </span>
        <span className="text-faint">{doc.at}</span>
      </p>

      <DocView doc={doc} />

      <div className="flex flex-wrap items-baseline justify-between gap-4 border-t border-line pt-5 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint">
        <span>
          pressure-tested on id<i className="font-light italic">8</i> · {doc.live ? "live nansen tape" : "fixture tape"} · writes your trade: never
        </span>
        <Link href="/" className="text-lock-deep transition-colors hover:text-lock">
          [ open the desk ]
        </Link>
      </div>
    </main>
  );
}
