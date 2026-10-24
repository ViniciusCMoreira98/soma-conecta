import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import SomaTabs from "@/components/SomaTabs";
import PhotoGrid from "@/components/PhotoGrid";
import { MeetingForm, PhotoUploader } from "@/components/MeetingForms";
import { Alert, ConfirmForm, StatusBadge } from "@/components/ui";
import { deleteMeeting } from "@/app/actions/meetings";
import { requireSomaMember } from "@/lib/soma-access";
import { formatDate, formatTime, todayLocal } from "@/lib/labels";
import AttendanceForm from "@/components/AttendanceForm";

export default async function ReuniaoPage({
  params, searchParams,
}: { params: Promise<{ id: string; mid: string }>; searchParams: Promise<{ criada?: string }> }) {
  const { id, mid } = await params;
  const { criada } = await searchParams;
  const { supabase, profile, user, isLeader, soma } = await requireSomaMember(id);

  const { data: m } = await supabase.from("meetings").select("*").eq("id", mid).eq("soma_id", id).maybeSingle();
  if (!m) notFound();

  const { data: photos } = await supabase.from("meeting_photos").select("id, storage_path, caption")
    .eq("meeting_id", mid).order("created_at");
  const { data: signed } = photos?.length
    ? await supabase.storage.from("meeting-photos").createSignedUrls(photos.map((p) => p.storage_path), 3600)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const future = m.meeting_date > todayLocal();

  // Presença: o responsável vê e edita a lista; o membro vê só se foi marcado presente.
  const [{ data: members }, { data: attendance }] = !future
    ? await Promise.all([
        isLeader
          ? supabase.from("soma_members").select("user_id, profile:profiles(full_name, avatar_url)")
              .eq("soma_id", id).eq("status", "ACTIVE").order("joined_at")
          : Promise.resolve({ data: [] as { user_id: string; profile: unknown }[] }),
        supabase.from("meeting_attendance").select("user_id").eq("meeting_id", mid),
      ])
    : [{ data: [] as { user_id: string; profile: unknown }[] }, { data: [] as { user_id: string }[] }];
  const presentIds = (attendance ?? []).map((a) => a.user_id);
  const memberList = (members ?? []).map((x) => {
    const p = x.profile as { full_name: string | null; avatar_url: string | null } | null;
    return { user_id: x.user_id, full_name: p?.full_name ?? "Membro", avatar_url: p?.avatar_url ?? null };
  });

  const grid = (photos ?? []).flatMap((p) => {
    const url = signed?.find((s) => s.path === p.storage_path)?.signedUrl;
    return url ? [{ id: p.id, url, caption: p.caption }] : [];
  });

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-extrabold text-soma-900">{soma.name}</h1>
      <SomaTabs somaId={id} active="reunioes" isLeader={isLeader} />
      <div className="mt-5 max-w-3xl space-y-5">
        <Link href={`/somas/${id}/reunioes`} className="text-sm font-medium text-soma-700 underline">← Reuniões</Link>
        {criada && (
          <Alert tone="success">
            {future ? "Reunião agendada. Os membros foram avisados." : "Reunião registrada. Agora você pode marcar a presença e adicionar fotos."}
          </Alert>
        )}

        <section className="card">
          <p className="text-xs font-semibold uppercase tracking-wide text-soma-700">
            {formatDate(m.meeting_date + "T12:00:00")}
            {m.start_time ? ` · ${formatTime(m.start_time)}${m.end_time ? `–${formatTime(m.end_time)}` : ""}` : ""}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold">{m.title || "Reunião do SOMA"}</h2>
            {future && <StatusBadge text="Agendada" tone="amber" />}
          </div>
          {m.description && <p className="mt-3 whitespace-pre-line text-stone-800">{m.description}</p>}
          {m.notes && <p className="mt-3 whitespace-pre-line text-sm text-stone-600"><strong>Observações: </strong>{m.notes}</p>}
        </section>

        {!future && !isLeader && m.attendance_taken_at && (
          <p className="card text-sm text-stone-700">
            {presentIds.includes(user.id) ? "Sua presença foi registrada nesta reunião." : "Sua presença não foi marcada nesta reunião."}
          </p>
        )}

        {!future && isLeader && (
          <AttendanceForm somaId={id} meetingId={mid} members={memberList} present={presentIds} taken={!!m.attendance_taken_at} />
        )}

        {!future && <section>
          <h2 className="mb-3 font-bold">Fotos ({grid.length})</h2>
          {grid.length ? (
            <PhotoGrid photos={grid} somaId={id} canDelete={isLeader} back={`/somas/${id}/reunioes/${mid}`} />
          ) : (
            <p className="card text-sm text-stone-600">Nenhuma foto nesta reunião.</p>
          )}
        </section>}

        {isLeader && (
          <>
            {future
              ? <p className="card text-sm text-stone-600">Presença e fotos ficam disponíveis a partir do dia da reunião.</p>
              : <PhotoUploader somaId={id} meetingId={mid} />}
            <details className="group">
              <summary className="btn-secondary cursor-pointer list-none">Editar informações da reunião</summary>
              <div className="mt-3"><MeetingForm somaId={id} meeting={m} /></div>
            </details>
            <ConfirmForm action={deleteMeeting} message="Excluir esta reunião e todas as suas fotos? Esta ação não pode ser desfeita.">
              <input type="hidden" name="soma_id" value={id} />
              <input type="hidden" name="meeting_id" value={mid} />
              <button className="text-sm font-semibold text-red-700 underline">Excluir reunião</button>
            </ConfirmForm>
          </>
        )}
      </div>
    </AppShell>
  );
}
