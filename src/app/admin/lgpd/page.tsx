import Link from "next/link";
import { privateProfiles } from "@/lib/profiles";
import { Alert, EmptyState, StatusBadge } from "@/components/ui";
import { decideDataRequest } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { DATA_REQUEST_KIND_LABEL, DATA_REQUEST_STATUS_LABEL, formatDateTime } from "@/lib/labels";

export const metadata = { title: "Pedidos LGPD" };

export default async function AdminLgpdPage({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;

  const { data: reqs } = await supabase.from("data_requests")
    .select("id, user_id, kind, details, status, response, created_at, handled_at")
    .order("created_at", { ascending: false }).limit(100);
  const contacts = await privateProfiles(supabase, (reqs ?? []).map((r) => r.user_id));
  const pending = reqs?.filter((r) => r.status === "PENDING") ?? [];
  const done = reqs?.filter((r) => r.status !== "PENDING") ?? [];
  const who = (x: unknown) => x as { full_name: string | null; email: string } | null;

  return (
    <div className="space-y-4">
      {sp.erro && <Alert tone="error">{sp.erro}</Alert>}
      {sp.ok && <Alert tone="success">{sp.ok}</Alert>}
      <Alert>
        Responda em até 15 dias. Para <strong>exclusão</strong>, abra o usuário e use “Excluir dados pessoais”; depois apague o login
        em Supabase → Authentication → Users e marque o pedido como atendido. Para <strong>correção</strong>, ajuste o dado e responda.
      </Alert>

      <h2 className="font-bold">Pendentes ({pending.length})</h2>
      {!pending.length ? <EmptyState title="Nenhum pedido pendente" /> : (
        <ul className="space-y-4">
          {pending.map((r) => {
            const u = who(contacts.get(r.user_id));
            return (
              <li key={r.id} className="card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{DATA_REQUEST_KIND_LABEL[r.kind]}</span>
                  <span className="text-xs text-stone-500">{formatDateTime(r.created_at)}</span>
                </div>
                <p className="text-sm">
                  <Link href={`/admin/usuarios/${r.user_id}`} className="font-semibold text-soma-800 underline">{u?.full_name ?? "Usuário"}</Link>
                  <span className="text-stone-500"> · {u?.email}</span>
                </p>
                <p className="whitespace-pre-line rounded-xl bg-stone-100 p-3 text-sm">{r.details}</p>
                <form action={decideDataRequest} className="space-y-2 border-t border-stone-200 pt-3">
                  <input type="hidden" name="request_id" value={r.id} />
                  <textarea name="response" required minLength={5} maxLength={1000} rows={2}
                    placeholder="Resposta ao titular (ele verá esta mensagem)" aria-label="Resposta ao titular" className="input py-2" />
                  <div className="flex flex-wrap gap-2">
                    <button name="decision" value="done" className="btn-primary">Marcar como atendido</button>
                    <button name="decision" value="reject" className="btn-secondary">Não atender</button>
                  </div>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      {!!done.length && (
        <>
          <h2 className="pt-4 font-bold">Respondidos</h2>
          <ul className="space-y-2">
            {done.map((r) => (
              <li key={r.id} className="card space-y-1 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span><strong>{DATA_REQUEST_KIND_LABEL[r.kind]}</strong> · {who(contacts.get(r.user_id))?.full_name}</span>
                  <StatusBadge {...DATA_REQUEST_STATUS_LABEL[r.status]} />
                </div>
                <p className="text-stone-600">{r.response}</p>
                <p className="text-xs text-stone-500">{r.handled_at ? formatDateTime(r.handled_at) : ""}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
