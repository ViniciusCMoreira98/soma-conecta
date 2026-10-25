import { appIconResponse } from "@/lib/app-icon";

// Ícones do manifesto do PWA: /icons/192 e /icons/512 (gerados no build).
const SIZES = ["192", "512"];
export const dynamic = "force-static";
export function generateStaticParams() {
  return SIZES.map((size) => ({ size }));
}

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  if (!SIZES.includes(size)) return new Response("Not found", { status: 404 });
  return appIconResponse(Number(size));
}
