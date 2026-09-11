"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/next";

/* Page views, with the share link's payload scrubbed: /s?d= carries the whole
   doc, and the doc is the trader's. The count stays, the query does not. */
export default function Analytics() {
  return (
    <VercelAnalytics
      beforeSend={(event) => {
        try {
          const u = new URL(event.url);
          if (u.pathname === "/s" || u.pathname.startsWith("/api/og")) {
            u.search = "";
            return { ...event, url: u.toString() };
          }
        } catch {}
        return event;
      }}
    />
  );
}
