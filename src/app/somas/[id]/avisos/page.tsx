import AppShell from "@/components/AppShell";
import SomaTabs from "@/components/SomaTabs";
import AnnouncementForm from "@/components/AnnouncementForm";
import { Alert, ConfirmForm, EmptyState } from "@/components/ui";
import { deleteAnnouncement } from "@/app/actions/announcements";
import { requireSomaMember } from "@/lib/soma-access";
import { formatDateTime } from "@/lib/labels";

export const metadata = { title: "Avisos do SOMA" };

export default async function AvisosPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, profile, isLeader, soma } = await requireSomaMember(id);

  const { data: avisos } = await supabase.from("soma_announcements")
    .select("id, title, body, created_at, author_id").eq("soma_id", id)
    .order("created_at", { ascending: false }).limit(50);

  const authorIds = [...new Set((avisos ?? []).flatMap((a) => (a.author_id ? [a.author_id] : [])))];
  const [{ data: authors }] = await Promise.all([
    authorIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", authorIds)
      : { data: [] as { id: string; full_name: string | null }[] },
    // Zera o contador da aba antes de renderizar.
    supabase.rpc("mark_announcements_read", { p_soma: id }),
  ]);

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-extrabold text-soma-900">{soma.name}</h1>
      <SomaTabs somaId={id} active="avisos" isLeader={isLeader} />
      <div className="mt-5 space-y-4">
        {sp.erro && <Alert tone="error">{sp.erro}</Alert>}
        {isLeader && <AnnouncementForm somaId={id} />}
        {!avisos?.length ? (
          <EmptyState title="Nenhum aviso ainda">
            {isLeader ? "Publique um aviso para que todos os membros fiquem sabendo." : "Os avisos do responsável aparecem aqui."}
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {avisos.map((a) => (
              <li key={a.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-bold text-stone-900">{a.title}</h2>
                  {isLeader && (
                    <ConfirmForm action={deleteAnnouncement} message="Remover este aviso?">
                      <input type="hidden" name="soma_id" value={id} />
                      <input type="hidden" name="announcement_id" value={a.id} />
                      <button className="text-sm font-semibold text-red-700 underline">Remover</button>
                    </ConfirmForm>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-stone-700">{a.body}</p>
                <p className="mt-3 text-xs text-stone-500">
                  {authors?.find((p) => p.id === a.author_id)?.full_name ?? "Responsável"} · {formatDateTime(a.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
