import Link from "next/link";
import AppShell from "@/components/AppShell";
import SomaTabs from "@/components/SomaTabs";
import { Alert, Avatar, EmptyState, StatusBadge } from "@/components/ui";
import { requireSomaMember } from "@/lib/soma-access";
import { formatDate, todayLocal } from "@/lib/labels";

export const metadata = { title: "Participação dos membros" };

const PERIODS = [
  { days: 30, label: "30 dias" },
  { days: 90, label: "3 meses" },
  { days: 180, label: "6 meses" },
  { days: 365, label: "12 meses" },
];

type Row = {
  user_id: string; full_name: string | null; avatar_url: string | null; role: "LEADER" | "MEMBER";
  joined_at: string; meetings_total: number; present: number; last_present: string | null;
};

export default async function ParticipacaoPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ dias?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, profile, soma } = await requireSomaMember(id, { leaderOnly: true });

  const days = PERIODS.find((p) => String(p.days) === sp.dias)?.days ?? 90;
  const since = new Date(new Date(todayLocal() + "T12:00:00").getTime() - days * 86400000).toISOString().slice(0, 10);

  const [{ data, error }, { count: pending }] = await Promise.all([
    supabase.rpc("soma_participation", { p_soma: id, p_since: since }),
    supabase.from("meetings").select("id", { count: "exact", head: true })
      .eq("soma_id", id).is("attendance_taken_at", null).gte("meeting_date", since).lte("meeting_date", todayLocal()),
  ]);
  const rows = (data ?? []) as Row[];
  const withMeetings = rows.filter((r) => r.meetings_total > 0);
  const avg = withMeetings.length
    ? Math.round((withMeetings.reduce((a, r) => a + r.present / r.meetings_total, 0) / withMeetings.length) * 100)
    : null;

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-extrabold text-soma-900">{soma.name}</h1>
      <SomaTabs somaId={id} active="participacao" isLeader />
      <div className="mt-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">Participação dos membros</h2>
          <nav aria-label="Período" className="flex flex-wrap gap-1">
            {PERIODS.map((p) => (
              <Link key={p.days} href={`/somas/${id}/participacao?dias=${p.days}`} aria-current={p.days === days ? "page" : undefined}
                className={`inline-flex min-h-[40px] items-center rounded-full px-3 text-sm font-semibold ${
                  p.days === days ? "bg-soma-600 text-white" : "border border-stone-300 bg-white text-stone-700"}`}>
                {p.label}
              </Link>
            ))}
          </nav>
        </div>

        {error && <Alert tone="error">Não foi possível carregar a participação.</Alert>}
        {!!pending && (
          <Alert>
            {pending} {pending === 1 ? "reunião realizada no período está" : "reuniões realizadas no período estão"} sem presença registrada e
            não {pending === 1 ? "entra" : "entram"} no cálculo. <Link href={`/somas/${id}/reunioes`} className="font-semibold underline">Registrar presença</Link>
          </Alert>
        )}
        {avg !== null && (
          <p className="text-sm text-stone-600">Média de presença do grupo no período: <strong className="text-soma-800">{avg}%</strong></p>
        )}

        {!rows.length ? (
          <EmptyState title="Nenhum membro ativo" />
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const pct = r.meetings_total ? Math.round((r.present / r.meetings_total) * 100) : null;
              const tone = pct === null ? "stone" : pct >= 75 ? "green" : pct >= 40 ? "amber" : "red";
              return (
                <li key={r.user_id} className="card flex flex-wrap items-center gap-3 py-3">
                  <Avatar name={r.full_name} url={r.avatar_url} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {r.full_name}
                      {r.role === "LEADER" && <span className="ml-2 text-xs font-normal text-stone-500">(responsável)</span>}
                    </p>
                    <p className="text-xs text-stone-500">
                      {r.meetings_total
                        ? `${r.present} de ${r.meetings_total} ${r.meetings_total === 1 ? "reunião" : "reuniões"}`
                        : "Sem reuniões com presença registrada desde a entrada"}
                      {r.last_present ? ` · última presença em ${formatDate(r.last_present + "T12:00:00")}` : ""}
                    </p>
                    {pct !== null && (
                      <div className="mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-stone-100" aria-hidden>
                        <div className="h-full rounded-full bg-soma-500" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                  <StatusBadge text={pct === null ? "—" : `${pct}%`} tone={tone} />
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-stone-500">
          Contam apenas reuniões já realizadas e com presença registrada, a partir da entrada de cada membro no app (ou anteriores, se ele foi marcado presente).
          Use este resumo para cuidar de quem está se afastando — ele não é visível para os membros.
        </p>
      </div>
    </AppShell>
  );
}
