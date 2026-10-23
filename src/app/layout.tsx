import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const font = Nunito({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "SOMA Conecta", template: "%s · SOMA Conecta" },
  description: "Encontre e gerencie os SOMAS da sua igreja: comunhão, estudo bíblico e oração perto de você.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#27704b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={font.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
