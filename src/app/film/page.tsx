import { notFound } from "next/navigation";
import Film from "@/components/film/Film";

/* the film booth lives on the dev desk only; decided per request, never baked into a prerender */
export const dynamic = "force-dynamic";

export default async function FilmPage({ searchParams }: { searchParams: Promise<{ auto?: string; end?: string }> }) {
  if (process.env.NODE_ENV === "production" && !process.env.ID8_FILM) notFound();
  const { auto, end } = await searchParams;
  return <Film auto={auto === "1"} end={end === "1"} />;
}
