import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Alert, EmptyState, StatusBadge } from "@/components/ui";
import { cancelJoin } from "@/app/actions/somas";
import { requireCompleteProfile } from "@/lib/auth";
import { JOIN_STATUS_LABEL, STATUS_LABEL, WEEKDAY_LABEL, formatDate, formatTime } from "@/lib/labels";

export const metadata = { title: "Meus SOMAS" };

export default async function MeusSomasPage({ searchParams }: { searchParams: Promise<{ enviado?: string; saiu?: string }> }) {
  const { supabase, profile, user } = await requireCompleteProfile();
  const { enviado, saiu } = await searchParams;

  const [{ data: memberships }, { data: joinReqs }, { data: myRegs }] = await Promise.all([
    supabase.from("soma_members").select("role, soma:somas(id, name, neighborhood, weekday, start_time)")
      .eq("user_id", user.id).eq("status", "ACTIVE"),
    supabase.from("soma_join_requests").select("id, status, created_at, rejection_reason, soma_id")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("soma_registration_requests").select("id, status, created_at, rejection_reason, soma:somas(name)")
      .eq("requester_id", user.id).order("created_at", { ascending: false }).limit(20),
  ]);

  // nomes dos SOMAS das solicitações de entrada (via visão pública)
  const ids = [...new Set((joinReqs ?? []).map((r) => r.soma_id))];
  const { data: names } = ids.length
    ? await supabase.from("somas_public").select("id, name").in("id", ids)
    : { data: [] as { id: string; name: string }[] };
  const nameOf = (id: string) => names?.find((n) => n.id === id)?.name ?? "SOMA";

  return (
    <AppShell profile={profile}>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-soma-900">Meus SOMAS</h1>
        <Link href="/cadastrar-soma" className="btn-secondary">Cadastrar meu SOMA</Link>
      </div>

      {saiu && <div className="mt-4"><Alert tone="success">Liderança transferida. Você saiu do SOMA.</Alert></div>}
      {enviado && <div className="mt-4"><Alert tone="success">Solicitação enviada! Avisaremos você quando a administração decidir.</Alert></div>}

      <h2 className="mb-3 mt-6 font-bold text-stone-800">Grupos dos quais participo</h2>
      {memberships?.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {memberships.map((m) => {
            const s = m.soma as unknown as { id: string; name: string; neighborhood: string; weekday: string; start_time: string };
            return (
              <li key={s.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/somas/${s.id}`} className="font-bold text-soma-800 hover:underline">{s.name}</Link>
                  {m.role === "LEADER" && <StatusBadge text="Responsável" tone="green" />}
                </div>
                <p className="mt-1 text-sm text-stone-600">{s.neighborhood} · {WEEKDAY_LABEL[s.weekday]} às {formatTime(s.start_time)}</p>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="Você ainda não participa de nenhum SOMA">
          <Link href="/encontrar" className="font-semibold text-soma-700 underline">Encontre um SOMA perto de você</Link>
        </EmptyState>
      )}

      {!!myRegs?.length && (
        <>
          <h2 className="mb-3 mt-8 font-bold text-stone-800">Meus pedidos de cadastro de SOMA</h2>
          <ul className="space-y-3">
            {myRegs.map((r) => {
              const st = STATUS_LABEL[r.status];
              return (
                <li key={r.id} className="card">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{(r.soma as unknown as { name: string })?.name}</span>
                    <StatusBadge {...st} />
                  </div>
                  <p className="mt-1 text-xs text-stone-500">Enviado em {formatDate(r.created_at)}</p>
                  {r.rejection_reason && <p className="mt-2 text-sm text-red-800">Motivo: {r.rejection_reason}</p>}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {!!joinReqs?.length && (
        <>
          <h2 className="mb-3 mt-8 font-bold text-stone-800">Minhas solicitações de entrada</h2>
          <ul className="space-y-3">
            {joinReqs.map((r) => (
              <li key={r.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{nameOf(r.soma_id)}</p>
                  <p className="text-xs text-stone-500">Solicitada em {formatDate(r.created_at)}</p>
                  {r.rejection_reason && <p className="mt-1 text-sm text-red-800">Motivo: {r.rejection_reason}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge {...JOIN_STATUS_LABEL[r.status]} />
                  {r.status === "PENDING" && (
                    <form action={cancelJoin}>
                      <input type="hidden" name="request_id" value={r.id} />
                      <button className="text-sm font-semibold text-red-700 underline">Cancelar</button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppShell>
  );
}
