import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Clock, History, MapPin, UserRound, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import SomaTabs from "@/components/SomaTabs";
import { Alert, ConfirmForm, StatusBadge } from "@/components/ui";
import { leaveSoma, requestJoin } from "@/app/actions/somas";
import { requireCompleteProfile } from "@/lib/auth";
import { FREQUENCY_LABEL, JOIN_STATUS_LABEL, WEEKDAY_LABEL, formatDate, formatTime, todayLocal } from "@/lib/labels";

export default async function SomaPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; solicitado?: string }> }) {
  const { id } = await params;
  const { erro, solicitado } = await searchParams;
  const { supabase, profile, user } = await requireCompleteProfile();

  // Dados públicos (sem informações pessoais) e associação (sob RLS; o servidor não confia na interface).
  const [{ data: soma }, { data: membership }] = await Promise.all([
    supabase.from("somas_public").select("*").eq("id", id).maybeSingle(),
    supabase.from("soma_members").select("role").eq("soma_id", id).eq("user_id", user.id).eq("status", "ACTIVE").maybeSingle(),
  ]);
  if (!soma) notFound();
  const isMember = !!membership;
  const isLeader = membership?.role === "LEADER";

  // Membros: dados extras (RLS em somas) + próximo encontro agendado (hoje em diante) e último realizado.
  // Não membros: só a última solicitação de entrada.
  const today = todayLocal();
  const none = { data: null };
  const [{ data: myReq }, { data: full }, { data: nextMeeting }, { data: lastMeeting }] = await Promise.all([
    isMember ? none : supabase.from("soma_join_requests").select("id, status").eq("soma_id", id).eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    isMember ? supabase.from("somas").select("location_hint, extra_info, frequency, end_time").eq("id", id).single() : none,
    isMember ? supabase.from("meetings").select("id, meeting_date, start_time, title").eq("soma_id", id)
      .gte("meeting_date", today).order("meeting_date").order("start_time", { nullsFirst: false }).limit(1).maybeSingle() : none,
    isMember ? supabase.from("meetings").select("id, meeting_date, start_time, title").eq("soma_id", id)
      .lt("meeting_date", today).order("meeting_date", { ascending: false }).limit(1).maybeSingle() : none,
  ]);
  const when = (m: { meeting_date: string; start_time: string | null }) =>
    `${formatDate(m.meeting_date + "T12:00:00")}${m.start_time ? ` às ${formatTime(m.start_time)}` : ""}`;

  return (
    <AppShell profile={profile}>
      <Link href={isMember ? "/meus-somas" : "/encontrar"} className="text-sm font-medium text-soma-700 underline">← Voltar</Link>
      {soma.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={soma.cover_url} alt={`Capa do SOMA ${soma.name}`} className="mt-3 aspect-[16/7] w-full rounded-xl2 object-cover" />
      )}
      <h1 className="mt-3 text-3xl font-extrabold text-soma-900">{soma.name}</h1>
      {isMember && <SomaTabs somaId={id} active="geral" isLeader={isLeader} />}

      <div className="mt-5 space-y-4">
        {erro && <Alert tone="error">{erro}</Alert>}
        {solicitado && <Alert tone="success">Solicitação enviada! O responsável vai analisar e você será avisado.</Alert>}

        <section className="card">
          <ul className="grid gap-2 text-stone-700 sm:grid-cols-2">
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-soma-600" aria-hidden /> {soma.neighborhood}</li>
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-soma-600" aria-hidden /> {WEEKDAY_LABEL[soma.weekday]} às {formatTime(soma.start_time)}
              {full?.end_time ? ` – ${formatTime(full.end_time)}` : ""}
            </li>
            <li className="flex items-center gap-2"><UserRound className="h-4 w-4 text-soma-600" aria-hidden /> Responsável: {soma.leader_name}</li>
            <li className="flex items-center gap-2"><Users className="h-4 w-4 text-soma-600" aria-hidden /> {soma.member_count} {Number(soma.member_count) === 1 ? "membro" : "membros"}</li>
          </ul>
          <p className="mt-4 whitespace-pre-line text-stone-800">{soma.description}</p>
          {isMember && full && (
            <dl className="mt-4 space-y-1 border-t border-stone-200 pt-4 text-sm text-stone-700">
              <div><dt className="inline font-semibold">Frequência: </dt><dd className="inline">{FREQUENCY_LABEL[soma.frequency]}</dd></div>
              {full.location_hint && <div><dt className="inline font-semibold">Local: </dt><dd className="inline">{full.location_hint}</dd></div>}
              {full.extra_info && <div><dt className="inline font-semibold">Informações: </dt><dd className="inline">{full.extra_info}</dd></div>}
            </dl>
          )}
        </section>

        {isMember && (
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="card text-sm text-stone-700">
              <h2 className="flex items-center gap-2 font-bold text-stone-900"><CalendarClock className="h-4 w-4 text-soma-600" aria-hidden /> Próximo encontro</h2>
              {nextMeeting ? (
                <Link href={`/somas/${id}/reunioes/${nextMeeting.id}`} className="mt-1 block font-semibold text-soma-700 underline">
                  {nextMeeting.meeting_date === today ? "Hoje" : when(nextMeeting)}
                  {nextMeeting.meeting_date === today && nextMeeting.start_time ? ` às ${formatTime(nextMeeting.start_time)}` : ""}
                  {nextMeeting.title ? ` · ${nextMeeting.title}` : ""}
                </Link>
              ) : (
                <p className="mt-1">
                  Nenhum encontro agendado.{" "}
                  {isLeader
                    ? <Link href={`/somas/${id}/reunioes/nova`} className="font-semibold text-soma-700 underline">Agendar o próximo</Link>
                    : `Encontros: ${WEEKDAY_LABEL[soma.weekday]} às ${formatTime(soma.start_time)}.`}
                </p>
              )}
            </div>
            <div className="card text-sm text-stone-700">
              <h2 className="flex items-center gap-2 font-bold text-stone-900"><History className="h-4 w-4 text-soma-600" aria-hidden /> Último encontro</h2>
              {lastMeeting ? (
                <Link href={`/somas/${id}/reunioes/${lastMeeting.id}`} className="mt-1 block font-semibold text-soma-700 underline">
                  {lastMeeting.title || "Encontro do SOMA"} · {formatDate(lastMeeting.meeting_date + "T12:00:00")}
                </Link>
              ) : (
                <p className="mt-1">Nenhum encontro registrado ainda.</p>
              )}
            </div>
          </section>
        )}

        {!isMember && (
          <section className="card">
            {myReq?.status === "PENDING" ? (
              <div className="flex items-center gap-3"><StatusBadge {...JOIN_STATUS_LABEL.PENDING} /> <span className="text-sm">Sua solicitação está aguardando o responsável.</span></div>
            ) : !soma.accepting_members ? (
              <p className="text-sm text-stone-700">Este SOMA não está aceitando novos membros no momento.</p>
            ) : (
              <form action={requestJoin} className="space-y-3">
                {myReq?.status === "REJECTED" && <p className="text-sm text-stone-600">Sua solicitação anterior não foi aprovada. Você pode tentar novamente.</p>}
                <input type="hidden" name="soma_id" value={id} />
                <p className="text-sm text-stone-600">Ao solicitar, o responsável verá seu nome, idade e celular para decidir sua entrada.</p>
                <button className="btn-primary w-full sm:w-auto">Solicitar entrada</button>
              </form>
            )}
          </section>
        )}

        {isMember && (
          <section className="card text-sm text-stone-600">
            {isLeader ? (
              <p>
                Você é o responsável. Para sair do SOMA,{" "}
                <Link href={`/somas/${id}/membros#transferir`} className="font-semibold text-soma-700 underline">transfira a liderança</Link> para outro membro.
              </p>
            ) : (
              <div>
                <ConfirmForm action={leaveSoma} message="Tem certeza que deseja sair deste SOMA?">
                  <input type="hidden" name="soma_id" value={id} />
                  <button className="font-semibold text-red-700 underline">Sair deste SOMA</button>
                </ConfirmForm>
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
