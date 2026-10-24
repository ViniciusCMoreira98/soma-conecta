import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import SomaTabs from "@/components/SomaTabs";
import { Alert, Avatar, ConfirmForm, StatusBadge } from "@/components/ui";
import { removeMember } from "@/app/actions/somas";
import { transferLeadership } from "@/app/actions/community";
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

  const list = (members ?? []).map((m) => {
    const p = m.profile as unknown as { full_name: string | null; avatar_url: string | null } | null;
    return { ...m, full_name: p?.full_name ?? "Membro", avatar_url: p?.avatar_url ?? null };
  });
  const candidates = list.filter((m) => m.role === "MEMBER");
  const back = `/somas/${id}/membros`;

  return (
    <AppShell profile={profile}>
      <Link href="/meus-somas" className="text-sm font-medium text-soma-700 underline">← Meus SOMAS</Link>
      <h1 className="mt-3 text-3xl font-extrabold text-soma-900">{soma.name}</h1>
      <SomaTabs somaId={id} active="membros" isLeader={isLeader} />

      <div className="mt-5 space-y-3">
        {erro && <Alert tone="error">{erro}</Alert>}
        {ok && <Alert tone="success">{ok === "1" ? "Alteração realizada." : ok}</Alert>}
        <p className="text-sm text-stone-600">{list.length} {list.length === 1 ? "membro ativo" : "membros ativos"}</p>
        <ul className="space-y-3">
          {list.map((m) => (
            <li key={m.user_id} className="card flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={m.full_name} url={m.avatar_url} size={44} />
                <div>
                  <p className="font-semibold">{m.full_name}{m.user_id === user.id && <span className="font-normal text-stone-500"> (você)</span>}</p>
                  <p className="text-xs text-stone-500">Entrou em {formatDate(m.joined_at)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {m.role === "LEADER" && <StatusBadge text="Responsável" tone="green" />}
                {isLeader && m.role === "MEMBER" && (
                  <>
                    <ConfirmForm action={transferLeadership}
                      message={`Tornar ${m.full_name} o responsável do SOMA? Você continuará como membro.`}>
                      <input type="hidden" name="soma_id" value={id} />
                      <input type="hidden" name="new_leader" value={m.user_id} />
                      <input type="hidden" name="back" value={back} />
                      <button className="text-sm font-semibold text-soma-700 underline">Tornar responsável</button>
                    </ConfirmForm>
                    <ConfirmForm action={removeMember} message={`Remover ${m.full_name} do SOMA?`}>
                      <input type="hidden" name="soma_id" value={id} />
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <button className="text-sm font-semibold text-red-700 underline">Remover</button>
                    </ConfirmForm>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>

        {isLeader && (
          <section id="transferir" className="card mt-6 space-y-3">
            <h2 className="font-bold text-stone-900">Transferir a liderança e sair do SOMA</h2>
            {candidates.length ? (
              <ConfirmForm action={transferLeadership}
                message="Transferir a liderança e sair deste SOMA? Você perderá o acesso ao grupo.">
                <input type="hidden" name="soma_id" value={id} />
                <input type="hidden" name="leave" value="1" />
                <input type="hidden" name="back" value={back} />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label htmlFor="new_leader" className="label">Novo responsável</label>
                    <select id="new_leader" name="new_leader" required defaultValue="" className="input">
                      <option value="" disabled>Escolha um membro…</option>
                      {candidates.map((c) => <option key={c.user_id} value={c.user_id}>{c.full_name}</option>)}
                    </select>
                  </div>
                  <button className="btn-danger">Transferir e sair</button>
                </div>
                <p className="mt-2 text-xs text-stone-500">O novo responsável é avisado e passa a aprovar entradas, registrar encontros e enviar fotos.</p>
              </ConfirmForm>
            ) : (
              <p className="text-sm text-stone-600">
                O SOMA ainda não tem outros membros. Para encerrar o grupo ou passar a liderança a alguém de fora, fale com a administração.
              </p>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
