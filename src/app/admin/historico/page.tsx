import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AUDIT_ACTION_LABEL, formatDateTime } from "@/lib/labels";

export const metadata = { title: "Histórico administrativo" };
const PAGE_SIZE = 50;

export default async function AdminHistoricoPage({ searchParams }: { searchParams: Promise<{ tipo?: string; pagina?: string }> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.pagina) || 1);

  let q = supabase.from("admin_audit_log")
    .select("id, action, target_type, target_id, details, created_at, actor:profiles!admin_audit_log_actor_id_fkey(full_name)", { count: "exact" })
    .order("created_at", { ascending: false });
  if (sp.tipo === "user" || sp.tipo === "soma") q = q.eq("target_type", sp.tipo);
  if (sp.tipo === "moderacao") q = q.in("target_type", ["message", "photo"]);
  const from = (page - 1) * PAGE_SIZE;
  const { data: rows, count } = await q.range(from, from + PAGE_SIZE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  // Nomes dos alvos (usuários e SOMAS) em lote.
  const userIds = [...new Set((rows ?? []).filter((r) => r.target_type === "user" && r.target_id).map((r) => r.target_id as string))];
  const somaIds = [...new Set((rows ?? []).filter((r) => r.target_type === "soma" && r.target_id).map((r) => r.target_id as string))];
  const [{ data: users }, { data: somas }] = await Promise.all([
    userIds.length ? supabase.from("profiles").select("id, full_name").in("id", userIds) : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    somaIds.length ? supabase.from("somas").select("id, name").in("id", somaIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const target = (r: { target_type: string; target_id: string | null }) => {
    if (r.target_type === "user") {
      const n = users?.find((u) => u.id === r.target_id)?.full_name ?? "usuário";
      return <Link href={`/admin/usuarios/${r.target_id}`} className="underline">{n}</Link>;
    }
    if (r.target_type === "soma") {
      const n = somas?.find((s) => s.id === r.target_id)?.name ?? "SOMA";
      return <Link href={`/admin/somas/${r.target_id}`} className="underline">{n}</Link>;
    }
    return r.target_type === "message" ? "mensagem do chat" : "foto de reunião";
  };

  const filters = [
    { v: "", label: "Tudo" }, { v: "user", label: "Usuários" }, { v: "soma", label: "SOMAS" }, { v: "moderacao", label: "Moderação" },
  ];

  return (
    <div className="space-y-4">
      <nav aria-label="Filtrar histórico" className="flex flex-wrap gap-1">
        {filters.map((f) => (
          <Link key={f.v} href={f.v ? `/admin/historico?tipo=${f.v}` : "/admin/historico"} aria-current={(sp.tipo ?? "") === f.v ? "page" : undefined}
            className={`inline-flex min-h-[40px] items-center rounded-full px-3 text-sm font-semibold ${
              (sp.tipo ?? "") === f.v ? "bg-soma-600 text-white" : "border border-stone-300 bg-white text-stone-700"}`}>
            {f.label}
          </Link>
        ))}
      </nav>
      {!rows?.length ? <p className="card text-sm text-stone-600">Nenhuma ação registrada.</p> : (
        <ol className="space-y-2">
          {rows.map((r) => {
            const d = (r.details ?? {}) as Record<string, string | null>;
            const note = d.reason ?? d.note ?? d.response;
            return (
              <li key={r.id} className="card py-3 text-sm">
                <p><strong>{AUDIT_ACTION_LABEL[r.action] ?? r.action}</strong> · {target(r)}</p>
                {note && <p className="text-stone-700">{note}</p>}
                <p className="text-xs text-stone-500">
                  {formatDateTime(r.created_at)} · por {(r.actor as unknown as { full_name: string })?.full_name ?? "administrador"}
                </p>
              </li>
            );
          })}
        </ol>
      )}
      {pages > 1 && (
        <nav aria-label="Paginação" className="flex items-center justify-between">
          {page > 1 ? <Link href={`/admin/historico?${new URLSearchParams({ ...(sp.tipo ? { tipo: sp.tipo } : {}), pagina: String(page - 1) })}`} className="btn-secondary">Anterior</Link> : <span />}
          <span className="text-sm text-stone-600">Página {page} de {pages}</span>
          {page < pages ? <Link href={`/admin/historico?${new URLSearchParams({ ...(sp.tipo ? { tipo: sp.tipo } : {}), pagina: String(page + 1) })}`} className="btn-secondary">Próxima</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
