import Link from "next/link";
import { privateProfiles } from "@/lib/profiles";
import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import SomaTabs from "@/components/SomaTabs";
import { Alert, EmptyState, StatusBadge } from "@/components/ui";
import { decideJoin } from "@/app/actions/somas";
import { requireCompleteProfile } from "@/lib/auth";
import { JOIN_STATUS_LABEL, formatDate } from "@/lib/labels";

export default async function SolicitacoesPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { id } = await params;
  const { erro, ok } = await searchParams;
  const { supabase, profile, user } = await requireCompleteProfile();

  const { data: me } = await supabase.from("soma_members").select("role")
    .eq("soma_id", id).eq("user_id", user.id).eq("status", "ACTIVE").maybeSingle();
  if (me?.role !== "LEADER") redirect(`/somas/${id}`);

  const { data: soma } = await supabase.from("somas").select("name").eq("id", id).single();
  if (!soma) notFound();

  const { data: reqs } = await supabase
    .from("soma_join_requests")
    .select("id, user_id, status, created_at, decided_at, rejection_reason, user:profiles!soma_join_requests_user_id_fkey(full_name)")
    .eq("soma_id", id).order("created_at", { ascending: false }).limit(50);

  // Idade, celular e bases só dos pedidos pendentes (profiles_private); no histórico, apenas o nome.
  const contacts = await privateProfiles(supabase, (reqs ?? []).filter((r) => r.status === "PENDING").map((r) => r.user_id));
  const pending = reqs?.filter((r) => r.status === "PENDING") ?? [];
  const history = reqs?.filter((r) => r.status !== "PENDING") ?? [];

  return (
    <AppShell profile={profile}>
      <Link href="/meus-somas" className="text-sm font-medium text-soma-700 underline">← Meus SOMAS</Link>
      <h1 className="mt-3 text-3xl font-extrabold text-soma-900">{soma.name}</h1>
      <SomaTabs somaId={id} active="solicitacoes" isLeader />

      <div className="mt-5 space-y-4">
        {erro && <Alert tone="error">{erro}</Alert>}
        {ok && <Alert tone="success">Decisão registrada.</Alert>}
        <h2 className="font-bold">Solicitações de entrada</h2>
        {!pending.length ? (
          <EmptyState title="Nenhuma solicitação pendente" />
        ) : (
          <ul className="space-y-3">
            {pending.map((r) => {
              const u = { ...(r.user as unknown as { full_name: string }), ...contacts.get(r.user_id) } as { full_name: string; age: number; phone: string; has_bases: boolean };
              return (
                <li key={r.id} className="card space-y-3">
                  <div>
                    <p className="font-semibold">{u?.full_name}</p>
                    <p className="text-sm text-stone-600">{u?.age} anos · {u?.phone} · Possui bases: {u?.has_bases ? "Sim" : "Não"}</p>
                    <p className="text-xs text-stone-500">Solicitada em {formatDate(r.created_at)}</p>
                  </div>
                  <form action={decideJoin} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="soma_id" value={id} />
                    <input type="hidden" name="request_id" value={r.id} />
                    <button name="decision" value="approve" className="btn-primary">Aprovar</button>
                    <input name="reason" placeholder="Motivo (se rejeitar, opcional)" className="input max-w-xs" aria-label="Motivo da rejeição" />
                    <button name="decision" value="reject" className="btn-secondary">Rejeitar</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        {!!history.length && (
          <>
            <h2 className="pt-4 font-bold">Histórico de decisões</h2>
            <ul className="space-y-2">
              {history.map((r) => {
                const u = r.user as unknown as { full_name: string };
                return (
                  <li key={r.id} className="card flex items-center justify-between gap-3 py-3">
                    <span className="text-sm">{u?.full_name} <span className="text-stone-500">· {r.decided_at ? formatDate(r.decided_at) : ""}</span></span>
                    <StatusBadge {...JOIN_STATUS_LABEL[r.status]} />
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </AppShell>
  );
}
