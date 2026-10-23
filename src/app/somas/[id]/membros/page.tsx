import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import SomaTabs from "@/components/SomaTabs";
import { Alert, ConfirmForm, StatusBadge } from "@/components/ui";
import { removeMember } from "@/app/actions/somas";
import { requireCompleteProfile } from "@/lib/auth";
import { formatDate } from "@/lib/labels";

export default async function MembrosPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { id } = await params;
  const { erro, ok } = await searchParams;
  const { supabase, profile, user } = await requireCompleteProfile();

  const { data: me } = await supabase.from("soma_members").select("role")
    .eq("soma_id", id).eq("user_id", user.id).eq("status", "ACTIVE").maybeSingle();
  if (!me) redirect(`/somas/${id}`);
  const isLeader = me.role === "LEADER";

  const { data: soma } = await supabase.from("somas").select("name").eq("id", id).single();
  if (!soma) notFound();

  const { data: members } = await supabase
    .from("soma_members")
    .select("user_id, role, joined_at, profile:profiles(full_name, avatar_url)")
    .eq("soma_id", id).eq("status", "ACTIVE").order("role").order("joined_at");

  return (
    <AppShell profile={profile}>
      <Link href="/meus-somas" className="text-sm font-medium text-soma-700 underline">← Meus SOMAS</Link>
      <h1 className="mt-3 text-3xl font-extrabold text-soma-900">{soma.name}</h1>
      <SomaTabs somaId={id} active="membros" isLeader={isLeader} />

      <div className="mt-5 space-y-3">
        {erro && <Alert tone="error">{erro}</Alert>}
        {ok && <Alert tone="success">Alteração realizada.</Alert>}
        <ul className="space-y-3">
          {members?.map((m) => {
            const p = m.profile as unknown as { full_name: string };
            return (
              <li key={m.user_id} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{p?.full_name}</p>
                  <p className="text-xs text-stone-500">Entrou em {formatDate(m.joined_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {m.role === "LEADER" && <StatusBadge text="Responsável" tone="green" />}
                  {isLeader && m.role === "MEMBER" && (
                    <ConfirmForm action={removeMember} message={`Remover ${p?.full_name} do SOMA?`}>
                      <input type="hidden" name="soma_id" value={id} />
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <button className="text-sm font-semibold text-red-700 underline">Remover</button>
                    </ConfirmForm>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}
