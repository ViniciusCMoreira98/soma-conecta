import { ImageResponse } from "next/og";

/**
 * Ícone do aplicativo (PWA, favicon e iPhone), desenhado em JSX e convertido em PNG pelo Next (next/og):
 * círculo verde com as três barras do logo SOMA sobre fundo areia. O círculo ocupa ~72% da área,
 * dentro da "zona segura" exigida pelos ícones maskable do Android.
 */
export function appIconResponse(size: number) {
  const ring = Math.round(size * 0.72);
  const stroke = Math.max(2, Math.round(size * 0.045));
  const barH = Math.round(size * 0.085);
  const gap = Math.round(size * 0.035);
  const green = "#3d5a45";
  const bar = (w: number) => (
    <div style={{ width: Math.round(size * w), height: barH, background: green, borderRadius: Math.round(barH * 0.35) }} />
  );
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, background: "#e6e3d8", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: ring, height: ring, borderRadius: "50%", border: `${stroke}px solid ${green}`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap,
          }}
        >
          {bar(0.34)}
          {bar(0.3)}
          {bar(0.34)}
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
