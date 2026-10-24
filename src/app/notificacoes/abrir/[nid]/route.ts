import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Marca a notificação como lida e segue para o link dela (somente caminhos internos). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ nid: string }> }) {
  const { nid } = await params;
  const supabase = await createClient();
  const { data: n } = await supabase.from("notifications").select("link, read_at").eq("id", nid).maybeSingle();
  if (n && !n.read_at) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", nid);
  }
  const link = n?.link && n.link.startsWith("/") && !n.link.startsWith("//") ? n.link : "/notificacoes";
  return NextResponse.redirect(new URL(link, request.url));
}
