import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, UserRound, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import SomaTabs from "@/components/SomaTabs";
import { Alert, ConfirmForm, StatusBadge } from "@/components/ui";
import { leaveSoma, requestJoin } from "@/app/actions/somas";
import { requireCompleteProfile } from "@/lib/auth";
import { FREQUENCY_LABEL, JOIN_STATUS_LABEL, WEEKDAY_LABEL, formatTime } from "@/lib/labels";

export default async function SomaPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; solicitado?: string }> }) {
  const { id } = await params;
  const { erro, solicitado } = await searchParams;
  const { supabase, profile, user } = await requireCompleteProfile();

  // Dados públicos (sem informações pessoais) — qualquer usuário autenticado.
  const { data: soma } = await supabase.from("somas_public").select("*").eq("id", id).maybeSingle();
  if (!soma) notFound();

  // A associação é consultada sob RLS; o servidor não confia na interface.
  const { data: membership } = await supabase
    .from("soma_members").select("role").eq("soma_id", id).eq("user_id", user.id).eq("status", "ACTIVE").maybeSingle();
  const isMember = !!membership;
  const isLeader = membership?.role === "LEADER";

  const { data: myReq } = isMember
    ? { data: null }
    : await supabase.from("soma_join_requests").select("id, status").eq("soma_id", id).eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();

  // Dados extras só para membros (RLS em somas)
  const { data: full } = isMember
    ? await supabase.from("somas").select("location_hint, extra_info, frequency, end_time").eq("id", id).single()
    : { data: null };

  return (
    <AppShell profile={profile}>
      <Link href={isMember ? "/meus-somas" : "/encontrar"} className="text-sm font-medium text-soma-700 underline">← Voltar</Link>
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
            <p>Reuniões, fotos e chat chegam nas próximas fases do projeto.</p>
            {!isLeader && (
              <div className="mt-3">
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
