import { notFound, redirect } from "next/navigation";
import { requireCompleteProfile } from "@/lib/auth";

/** Garante que o usuário é membro ativo do SOMA (e opcionalmente responsável). Confere no banco, sob RLS. */
export async function requireSomaMember(somaId: string, opts: { leaderOnly?: boolean } = {}) {
  const s = await requireCompleteProfile();
  const { data: me } = await s.supabase
    .from("soma_members").select("role, chat_muted")
    .eq("soma_id", somaId).eq("user_id", s.user.id).eq("status", "ACTIVE").maybeSingle();
  if (!me) redirect(`/somas/${somaId}`);
  const isLeader = me.role === "LEADER";
  if (opts.leaderOnly && !isLeader) redirect(`/somas/${somaId}`);
  const { data: soma } = await s.supabase.from("somas").select("id, name").eq("id", somaId).single();
  if (!soma) notFound();
  return { ...s, isLeader, soma, chatMuted: !!me.chat_muted };
}
