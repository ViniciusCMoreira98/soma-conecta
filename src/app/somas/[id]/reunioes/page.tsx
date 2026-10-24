import Link from "next/link";
import AppShell from "@/components/AppShell";
import SomaTabs from "@/components/SomaTabs";
import { Alert, EmptyState, StatusBadge } from "@/components/ui";
import { requireSomaMember } from "@/lib/soma-access";
import { formatDate, formatTime, todayLocal } from "@/lib/labels";

type Row = {
  id: string; meeting_date: string; start_time: string | null; title: string | null; description: string | null;
  attendance_taken_at: string | null; photos: unknown;
};

export default async function ReunioesPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, profile, isLeader, soma } = await requireSomaMember(id);
  const today = todayLocal();

  const [{ data: upcoming }, { data: past, count }] = await Promise.all([
    supabase.from("meetings")
      .select("id, meeting_date, start_time, title, description, attendance_taken_at, photos:meeting_photos(count)")
      .eq("soma_id", id).gte("meeting_date", today)
      .order("meeting_date").order("start_time", { nullsFirst: false }).limit(20),
    supabase.from("meetings")
      .select("id, meeting_date, start_time, title, description, attendance_taken_at, photos:meeting_photos(count)", { count: "exact" })
      .eq("soma_id", id).lt("meeting_date", today)
      .order("meeting_date", { ascending: false }).order("start_time", { ascending: false, nullsFirst: false }).limit(100),
  ]);

  const card = (m: Row, future: boolean) => {
    const photoCount = (m.photos as { count: number }[])?.[0]?.count ?? 0;
    return (
      <li key={m.id}>
        <Link href={`/somas/${id}/reunioes/${m.id}`} className="card block hover:border-soma-300">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-soma-700">
              {m.meeting_date === today ? "Hoje" : formatDate(m.meeting_date + "T12:00:00")}
              {m.start_time ? ` · ${formatTime(m.start_time)}` : ""}
            </p>
            {future && <StatusBadge text={m.meeting_date === today ? "Hoje" : "Agendada"} tone="amber" />}
          </div>
          <p className="mt-1 font-bold text-stone-900">{m.title || "Encontro do SOMA"}</p>
          {m.description && <p className="mt-1 line-clamp-2 text-sm text-stone-600">{m.description}</p>}
          {!future && (
            <p className="mt-2 text-xs text-stone-500">
              {photoCount} {photoCount === 1 ? "foto" : "fotos"}
              {isLeader && !m.attendance_taken_at && " · presença não registrada"}
            </p>
          )}
        </Link>
      </li>
    );
  };

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-extrabold text-soma-900">{soma.name}</h1>
      <SomaTabs somaId={id} active="reunioes" isLeader={isLeader} />
      <div className="mt-5 space-y-4">
        {sp.erro && <Alert tone="error">{sp.erro}</Alert>}
        {sp.ok && <Alert tone="success">Encontro excluído.</Alert>}
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold">Próximos encontros</h2>
          {isLeader && <Link href={`/somas/${id}/reunioes/nova`} className="btn-primary">Novo encontro</Link>}
        </div>
        {!upcoming?.length ? (
          <p className="card text-sm text-stone-600">
            {isLeader ? "Nenhum encontro agendado. Use “Novo encontro” com uma data futura para avisar o grupo." : "Nenhum encontro agendado no momento."}
          </p>
        ) : (
          <ul className="space-y-3">{(upcoming as Row[]).map((m) => card(m, true))}</ul>
        )}

        <h2 className="pt-2 font-bold">
          Encontros realizados <span className="text-sm font-normal text-stone-500">({count ?? 0})</span>
        </h2>
        {!past?.length ? (
          <EmptyState title="Nenhum encontro realizado ainda">
            {isLeader ? "Registre os encontros do seu SOMA para montar o histórico." : "O responsável ainda não registrou encontros."}
          </EmptyState>
        ) : (
          <ul className="space-y-3">{(past as Row[]).map((m) => card(m, false))}</ul>
        )}
      </div>
    </AppShell>
  );
}
