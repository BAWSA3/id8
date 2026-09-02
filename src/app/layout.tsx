import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jbMono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "id8 — your thesis · the chain pushes back",
  description:
    "The thesis desk for narrative traders. Present your play; id8 interrogates it and tests it against live Nansen smart-money flows. It never writes the trade — conviction stays yours.",
  openGraph: {
    title: "id8 — your thesis · the chain pushes back",
    description:
      "The thesis desk for narrative traders. Present your play; id8 interrogates it and tests it against live smart-money flows.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "id8 — your thesis · the chain pushes back",
    description:
      "The thesis desk for narrative traders. Present your play; id8 interrogates it and tests it against live smart-money flows.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={jbMono.variable}>
      <body>
        <div className="grain" />
        <span className="crop tl" /><span className="crop tr" />
        <span className="crop bl" /><span className="crop br" />
        {children}
      </body>
    </html>
  );
}
