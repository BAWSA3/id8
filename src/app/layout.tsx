import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jbMono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "id8 — you think, we interrogate",
  description:
    "A creative workspace where AI interrogates your idea instead of writing it — and live onchain data pushes back.",
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
