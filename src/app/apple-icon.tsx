import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const ISO_SVG = `<svg viewBox="0 0 110 104" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="8" width="90" height="64" rx="16" fill="#0C4A31"/>
  <polygon points="32,70 32,96 56,70" fill="#0C4A31"/>
  <path d="M32 48 L55 28 L78 48" fill="none" stroke="#F6F3EC" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="49" y="44" width="12" height="14" rx="2" fill="#E8A13C"/>
</svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F6F3EC",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/svg+xml,${encodeURIComponent(ISO_SVG)}`} width={132} height={125} alt="" />
      </div>
    ),
    size
  );
}
