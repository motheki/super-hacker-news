import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "~/lib/site";

export const alt = `${SITE_NAME} — ${SITE_DESCRIPTION}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#000",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        fontFamily: "monospace",
        height: "100%",
        justifyContent: "center",
        padding: "80px",
        textAlign: "center",
        width: "100%",
      }}
    >
      <div style={{ fontSize: 106, fontWeight: 700 }}>{SITE_NAME}</div>
      <div style={{ fontSize: 44, marginTop: 32 }}>{SITE_DESCRIPTION}</div>
    </div>,
    { ...size },
  );
}
