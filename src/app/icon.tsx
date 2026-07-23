import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 7,
          position: "relative",
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "sans-serif" }}>v</span>
        <div
          style={{
            position: "absolute",
            right: 5,
            bottom: 5,
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#e8a13c",
          }}
        />
      </div>
    ),
    size
  );
}
