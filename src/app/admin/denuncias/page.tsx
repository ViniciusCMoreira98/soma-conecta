import Link from "next/link";
import { Alert, EmptyState, StatusBadge } from "@/components/ui";
import { resolveReport } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { REPORT_REASON_LABEL, REPORT_STATUS_LABEL, formatDateTime } from "@/lib/labels";

export const metadata = { title: "Denúncias" };

export default async function AdminDenunciasPage({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;

  const sel = `id, target_type, target_id, content_snapshot, reason, details, status, content_removed, created_at, resolved_at, resolution_note,
    soma_id, soma:somas(name),
    reporter:profiles!reports_reporter_id_fkey(full_name),
    author:profiles!reports_reported_user_id_fkey(id, full_name)`;
  const [{ data: open }, { data: closed }] = await Promise.all([
    supabase.from("reports").select(sel).eq("status", "OPEN").order("created_at").limit(100),
    supabase.from("reports").select(sel).neq("status", "OPEN").order("resolved_at", { ascending: false }).limit(30),
  ]);

  // Várias pessoas podem denunciar o mesmo conteúdo: mostra um cartão por conteúdo.
  type R = NonNullable<typeof open>[number];
  const groups = new Map<string, R[]>();
  (open ?? []).forEach((r) => {
    const k = `${r.target_type}:${r.target_id}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  });

  // URLs temporárias das fotos denunciadas (a política de Storage permite leitura ao admin).
  const photoPaths = (open ?? []).filter((r) => r.target_type === "PHOTO" && r.content_snapshot).map((r) => r.content_snapshot as string);
  const { data: signed } = photoPaths.length
    ? await supabase.storage.from("meeting-photos").createSignedUrls([...new Set(photoPaths)], 600)
    : { data: [] as { path: string | null; signedUrl: string }[] };

  const name = (x: unknown) => (x as { full_name?: string } | null)?.full_name ?? "—";

  return (
    <div className="space-y-4">
      {sp.erro && <Alert tone="error">{sp.erro}</Alert>}
      {sp.ok && <Alert tone="success">{sp.ok}</Alert>}

      <h2 className="font-bold">Aguardando análise ({groups.size})</h2>
      {!groups.size ? <EmptyState title="Nenhuma denúncia aberta" /> : (
        <ul className="space-y-4">
          {[...groups.values()].map((reps) => {
            const r = reps[0];
            const url = r.target_type === "PHOTO" ? signed?.find((s) => s.path === r.content_snapshot)?.signedUrl : null;
            const author = r.author as unknown as { id: string; full_name: string } | null;
            return (
              <li key={r.id} className="card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    <strong>{r.target_type === "MESSAGE" ? "Mensagem" : "Foto"}</strong> em{" "}
                    <Link href={`/admin/somas/${r.soma_id}`} className="font-semibold text-soma-800 underline">{name(r.soma)}</Link>
                    {author && <> · autor: <Link href={`/admin/usuarios/${author.id}`} className="underline">{author.full_name}</Link></>}
                  </span>
                  {reps.length > 1 && <StatusBadge text={`${reps.length} denúncias`} tone="red" />}
                </div>

                {r.target_type === "MESSAGE" ? (
                  <blockquote className="whitespace-pre-wrap rounded-xl bg-stone-100 p-3 text-sm text-stone-900">{r.content_snapshot}</blockquote>
                ) : url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="Foto denunciada" className="max-h-80 rounded-xl object-contain" />
                ) : (
                  <p className="text-sm text-stone-500">A foto não está mais disponível (pode já ter sido apagada pelo responsável).</p>
                )}

                <ul className="space-y-1 text-sm text-stone-700">
                  {reps.map((x) => (
                    <li key={x.id}>
                      <strong>{REPORT_REASON_LABEL[x.reason]}</strong> — por {name(x.reporter)}, {formatDateTime(x.created_at)}
                      {x.details && <span className="block text-stone-600">“{x.details}”</span>}
                    </li>
                  ))}
                </ul>

                <form action={resolveReport} className="flex flex-col gap-2 border-t border-stone-200 pt-3 sm:flex-row sm:items-center">
                  <input type="hidden" name="report_id" value={r.id} />
                  <input name="note" maxLength={500} placeholder="Observação interna (opcional)" aria-label="Observação" className="input sm:flex-1" />
                  <button name="decision" value="remove" className="btn-danger">Remover {r.target_type === "MESSAGE" ? "mensagem" : "foto"}</button>
                  <button name="decision" value="dismiss" className="btn-secondary">Arquivar</button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      {!!closed?.length && (
        <>
          <h2 className="pt-4 font-bold">Analisadas recentemente</h2>
          <ul className="space-y-2">
            {closed.map((r) => (
              <li key={r.id} className="card flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span>
                  {r.target_type === "MESSAGE" ? "Mensagem" : "Foto"} em <strong>{name(r.soma)}</strong> · {REPORT_REASON_LABEL[r.reason]}
                  <span className="text-stone-500"> · {r.resolved_at ? formatDateTime(r.resolved_at) : ""}</span>
                  {r.resolution_note && <span className="block text-stone-600">{r.resolution_note}</span>}
                </span>
                <StatusBadge {...REPORT_STATUS_LABEL[r.status]} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
