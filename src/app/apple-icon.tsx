import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
          background: "#0c4a31",
          position: "relative",
        }}
      >
        <span style={{ fontSize: 110, fontWeight: 800, color: "#fff", fontFamily: "sans-serif" }}>v</span>
        <div
          style={{
            position: "absolute",
            right: 32,
            bottom: 32,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#e8a13c",
          }}
        />
      </div>
    ),
    size
  );
}
