import { ImageResponse } from "next/og";
import { REPO_URL } from "@/lib/site";

export const runtime = "nodejs";
export const alt = "Propical — open-source property manager for short-term rentals";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          // Brand dark palette: areia #171009 → noite
          // #241A10 with a warm ambar-tinged falloff, ambar #F0B257
          // accents, noite #F4EDDF text.
          background:
            "linear-gradient(135deg, #171009 0%, #241a10 55%, #24170a 100%)",
          color: "#F4EDDF",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Brandbook variant "a · uso principal": gradient tile
              (âmbar→coral) + full areia sun + noite house silhouette.
              Same 120-unit geometry as public/icon.svg, rendered inline
              (Satori has no SVG asset loading); the tile itself is a CSS
              gradient div so Satori doesn't need SVG gradient support. */}
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #F2A93B 0%, #FF6A47 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <svg width="56" height="56" viewBox="0 0 120 120">
              <circle cx="74" cy="40" r="26" fill="#FAF5EC" />
              <path d="M48 36 L24 64 L24 88 L72 88 L72 64 Z" fill="#241A10" />
            </svg>
          </div>
          {/* Wordmark: fixed lowercase per brand convention. */}
          <div style={{ fontSize: "32px", fontWeight: 600, letterSpacing: "-0.02em" }}>
            propical
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              fontSize: "28px",
              color: "#F0B257",
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Open source · Free hosted version
          </div>
          <div
            style={{
              fontSize: "64px",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              maxWidth: "1000px",
            }}
          >
            Self-host your short-term rental calendar, cleaning schedule, and guest documents.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "24px",
            color: "#C9A96E",
          }}
        >
          <div>propical.com.br</div>
          <div>{REPO_URL.replace("https://", "")}</div>
        </div>
      </div>
    ),
    size,
  );
}
