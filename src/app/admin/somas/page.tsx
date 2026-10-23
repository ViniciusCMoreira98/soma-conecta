import Link from "next/link";
import { Alert, ConfirmForm, StatusBadge } from "@/components/ui";
import { toggleSuspend } from "@/app/actions/somas";
import { requireAdmin } from "@/lib/auth";
import { STATUS_LABEL, formatDate } from "@/lib/labels";

export const metadata = { title: "Gestão de SOMAS" };
const STATUSES = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"];

export default async function AdminSomasPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; erro?: string; ok?: string }> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;

  let query = supabase
    .from("somas")
    .select("id, name, neighborhood, status, created_at, leader:profiles!somas_leader_id_fkey(full_name)")
    .order("created_at", { ascending: false }).limit(100);
  if (sp.q) query = query.ilike("name", `%${sp.q.replace(/[%,()*\\]/g, " ").trim()}%`);
  if (sp.status && STATUSES.includes(sp.status)) query = query.eq("status", sp.status);
  const { data: somas } = await query;

  return (
    <div className="space-y-4">
      {sp.erro && <Alert tone="error">{sp.erro}</Alert>}
      {sp.ok && <Alert tone="success">Alteração realizada.</Alert>}
      <form className="card grid gap-3 sm:grid-cols-3" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Buscar por nome" aria-label="Buscar por nome" className="input" />
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className="input">
          <option value="">Todos os status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s].text}</option>)}
        </select>
        <button className="btn-primary">Filtrar</button>
      </form>

      <div className="overflow-x-auto rounded-xl2 border border-stone-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="px-4 py-3">SOMA</th><th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Bairro</th><th className="px-4 py-3">Solicitação</th>
              <th className="px-4 py-3">Status</th><th className="px-4 py-3"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {somas?.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-semibold">{s.name}</td>
                <td className="px-4 py-3">{(s.leader as unknown as { full_name: string })?.full_name}</td>
                <td className="px-4 py-3">{s.neighborhood}</td>
                <td className="px-4 py-3">{formatDate(s.created_at)}</td>
                <td className="px-4 py-3"><StatusBadge {...STATUS_LABEL[s.status]} /></td>
                <td className="px-4 py-3 text-right">
                  {s.status === "PENDING" && <Link href="/admin/solicitacoes" className="font-semibold text-soma-700 underline">Analisar</Link>}
                  {(s.status === "APPROVED" || s.status === "SUSPENDED") && (
                    <ConfirmForm action={toggleSuspend} message={s.status === "APPROVED" ? "Suspender este SOMA?" : "Reativar este SOMA?"}>
                      <input type="hidden" name="soma_id" value={s.id} />
                      <input type="hidden" name="suspend" value={s.status === "APPROVED" ? "1" : "0"} />
                      <button className="font-semibold text-soma-700 underline">{s.status === "APPROVED" ? "Suspender" : "Reativar"}</button>
                    </ConfirmForm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!somas?.length && <p className="p-6 text-center text-sm text-stone-600">Nenhum SOMA encontrado.</p>}
      </div>
    </div>
  );
}
