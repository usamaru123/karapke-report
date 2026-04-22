import { ImageResponse } from "next/og";

// iOS home-screen icon. Apple requires an opaque background (no transparency)
// and 180x180 is the preferred size for modern iPhones.

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
          background:
            "radial-gradient(circle at 30% 30%, #ff2a8a 0%, #7b1fa2 55%, #0a0a14 100%)",
          fontFamily: "sans-serif",
          color: "#ffffff",
          fontWeight: 800,
          fontSize: 92,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          textShadow:
            "0 0 12px rgba(255,42,138,0.9), 0 0 24px rgba(255,42,138,0.6)",
        }}
      >
        カ
      </div>
    ),
    { ...size },
  );
}
