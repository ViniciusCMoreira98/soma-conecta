import { Alert, ConfirmForm, EmptyState, StatusBadge } from "@/components/ui";
import { privateProfiles } from "@/lib/profiles";
import { decideRegistration } from "@/app/actions/somas";
import { requireAdmin } from "@/lib/auth";
import { FREQUENCY_LABEL, STATUS_LABEL, WEEKDAY_LABEL, formatDate, formatTime } from "@/lib/labels";

export const metadata = { title: "Solicitações de SOMAS" };

export default async function AdminSolicitacoesPage({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { supabase } = await requireAdmin();
  const { erro, ok } = await searchParams;

  const { data: reqs } = await supabase
    .from("soma_registration_requests")
    .select(`id, status, created_at, decided_at, rejection_reason,
      requester_id,
      soma:somas(name, description, neighborhood, weekday, start_time, end_time, frequency, location_hint, extra_info)`)
    .order("created_at", { ascending: false }).limit(100);

  // Dados de contato via profiles_private (a tabela profiles não expõe celular/e-mail).
  const contacts = await privateProfiles(supabase, (reqs ?? []).map((r) => r.requester_id));
  const pending = reqs?.filter((r) => r.status === "PENDING") ?? [];
  const decided = reqs?.filter((r) => r.status !== "PENDING") ?? [];

  return (
    <div className="space-y-4">
      {erro && <Alert tone="error">{erro}</Alert>}
      {ok && <Alert tone="success">Decisão registrada e o responsável foi notificado.</Alert>}

      <h2 className="font-bold">Aguardando decisão ({pending.length})</h2>
      {!pending.length ? <EmptyState title="Nenhuma solicitação pendente" /> : (
        <ul className="space-y-4">
          {pending.map((r) => {
            const s = r.soma as unknown as Record<string, string>;
            const u = (contacts.get(r.requester_id) ?? {}) as unknown as Record<string, string>;
            return (
              <li key={r.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold text-soma-900">{s.name}</h3>
                  <StatusBadge {...STATUS_LABEL.PENDING} />
                </div>
                <p className="whitespace-pre-line text-sm text-stone-700">{s.description}</p>
                <dl className="grid gap-1 text-sm text-stone-600 sm:grid-cols-2">
                  <div>Bairro: {s.neighborhood}</div>
                  <div>{WEEKDAY_LABEL[s.weekday]} · {formatTime(s.start_time)}{s.end_time ? `–${formatTime(s.end_time)}` : ""}</div>
                  <div>Frequência: {FREQUENCY_LABEL[s.frequency]}</div>
                  {s.location_hint && <div>Local: {s.location_hint}</div>}
                  <div className="sm:col-span-2">Responsável: {u.full_name} · {u.email} · {u.phone} · {u.age} anos</div>
                  <div className="sm:col-span-2">Solicitado em {formatDate(r.created_at)}</div>
                </dl>
                <div className="flex flex-col gap-3 border-t border-stone-200 pt-3 sm:flex-row sm:items-start">
                  <ConfirmForm action={decideRegistration} message={`Aprovar o SOMA "${s.name}"?`}>
                    <input type="hidden" name="request_id" value={r.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <button className="btn-primary w-full">Aprovar</button>
                  </ConfirmForm>
                  <ConfirmForm action={decideRegistration} message={`Rejeitar o SOMA "${s.name}"?`}>
                    <input type="hidden" name="request_id" value={r.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input name="reason" required minLength={5} placeholder="Motivo da rejeição" aria-label="Motivo da rejeição" className="input sm:w-72" />
                      <button className="btn-danger">Rejeitar</button>
                    </div>
                  </ConfirmForm>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!!decided.length && (
        <>
          <h2 className="pt-4 font-bold">Histórico de decisões</h2>
          <ul className="space-y-2">
            {decided.map((r) => (
              <li key={r.id} className="card flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span>
                  <strong>{(r.soma as unknown as { name: string })?.name}</strong>
                  <span className="text-stone-500"> · {r.decided_at ? formatDate(r.decided_at) : ""}</span>
                  {r.rejection_reason && <span className="block text-red-800">Motivo: {r.rejection_reason}</span>}
                </span>
                <StatusBadge {...STATUS_LABEL[r.status]} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
