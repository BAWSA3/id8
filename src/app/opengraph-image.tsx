import { ImageResponse } from "next/og";

/* The unfurl card — eclipse + wordmark + tagline on darkroom black.
   Served automatically as og:image and twitter:image by Next. */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "id8 — a canvas for your thesis";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a09",
        }}
      >
        <div
          style={{
            width: 130,
            height: 130,
            borderRadius: 9999,
            background: "#e9e4d6",
            boxShadow: "-38px 0 80px rgba(233, 228, 214, 0.4)",
            marginBottom: 56,
            display: "flex",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontSize: 118,
            lineHeight: 1,
            color: "#e9e4d6",
            fontWeight: 700,
            letterSpacing: -2,
          }}
        >
          id
          <span style={{ fontWeight: 300, fontStyle: "italic" }}>8</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 40,
            fontSize: 25,
            letterSpacing: 9,
            color: "#8b8678",
          }}
        >
          A CANVAS FOR YOUR THESIS
        </div>
      </div>
    ),
    size
  );
}
