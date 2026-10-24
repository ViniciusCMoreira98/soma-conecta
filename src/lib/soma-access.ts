import { notFound, redirect } from "next/navigation";
import { requireCompleteProfile } from "@/lib/auth";

/** Garante que o usuário é membro ativo do SOMA (e opcionalmente responsável). Confere no banco, sob RLS. */
export async function requireSomaMember(somaId: string, opts: { leaderOnly?: boolean } = {}) {
  const s = await requireCompleteProfile();
  const [{ data: me }, { data: soma }] = await Promise.all([
    s.supabase.from("soma_members").select("role")
      .eq("soma_id", somaId).eq("user_id", s.user.id).eq("status", "ACTIVE").maybeSingle(),
    s.supabase.from("somas").select("id, name").eq("id", somaId).maybeSingle(),
  ]);
  if (!me) redirect(`/somas/${somaId}`);
  const isLeader = me.role === "LEADER";
  if (opts.leaderOnly && !isLeader) redirect(`/somas/${somaId}`);
  if (!soma) notFound();
  return { ...s, isLeader, soma };
}
