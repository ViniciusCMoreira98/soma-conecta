import Link from "next/link";
import { Alert, Avatar, StatusBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { ACCOUNT_STATUS_LABEL, formatDate } from "@/lib/labels";

export const metadata = { title: "Gestão de usuários" };
const PAGE_SIZE = 25;
const clean = (s: string) => s.replace(/[%,()*\\]/g, " ").trim().slice(0, 80);

type SP = { q?: string; status?: string; papel?: string; pagina?: string; erro?: string; ok?: string };

export default async function AdminUsuariosPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.pagina) || 1);

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, phone, avatar_url, role, status, created_at", { count: "exact" })
    .order("created_at", { ascending: false });
  const q = sp.q ? clean(sp.q) : "";
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q.replace(/\D/g, "") || q}%`);
  if (sp.status === "ACTIVE" || sp.status === "SUSPENDED") query = query.eq("status", sp.status);
  if (sp.papel === "ADMIN" || sp.papel === "MEMBER") query = query.eq("role", sp.papel);
  const from = (page - 1) * PAGE_SIZE;
  const { data: users, count } = await query.range(from, from + PAGE_SIZE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const qs = (p: number) => {
    const u = new URLSearchParams();
    (["q", "status", "papel"] as const).forEach((k) => sp[k] && u.set(k, sp[k]!));
    u.set("pagina", String(p));
    return `/admin/usuarios?${u}`;
  };

  return (
    <div className="space-y-4">
      {sp.erro && <Alert tone="error">{sp.erro}</Alert>}
      {sp.ok && <Alert tone="success">{sp.ok}</Alert>}
      <form className="card grid gap-3 sm:grid-cols-4" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Nome, e-mail ou celular" aria-label="Buscar usuário" className="input sm:col-span-2" />
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Situação da conta" className="input">
          <option value="">Todas as contas</option>
          <option value="ACTIVE">Ativas</option>
          <option value="SUSPENDED">Suspensas</option>
        </select>
        <select name="papel" defaultValue={sp.papel ?? ""} aria-label="Papel" className="input">
          <option value="">Todos os papéis</option>
          <option value="MEMBER">Membros</option>
          <option value="ADMIN">Administradores</option>
        </select>
        <button className="btn-primary sm:col-span-4 sm:w-auto sm:justify-self-start">Buscar</button>
      </form>

      <p className="text-sm text-stone-600">{count ?? 0} {count === 1 ? "usuário encontrado" : "usuários encontrados"}</p>
      <ul className="space-y-2">
        {users?.map((u) => (
          <li key={u.id}>
            <Link href={`/admin/usuarios/${u.id}`} className="card flex flex-wrap items-center gap-3 py-3 hover:border-soma-300">
              <Avatar name={u.full_name} url={u.avatar_url} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{u.full_name ?? "(perfil incompleto)"}</p>
                <p className="truncate text-xs text-stone-500">{u.email}{u.phone ? ` · ${u.phone}` : ""} · desde {formatDate(u.created_at)}</p>
              </div>
              {u.role === "ADMIN" && <StatusBadge text="Admin" tone="green" />}
              <StatusBadge {...ACCOUNT_STATUS_LABEL[u.status]} />
            </Link>
          </li>
        ))}
      </ul>
      {!users?.length && <p className="card text-center text-sm text-stone-600">Nenhum usuário encontrado.</p>}
      {pages > 1 && (
        <nav aria-label="Paginação" className="flex items-center justify-between">
          {page > 1 ? <Link href={qs(page - 1)} className="btn-secondary">Anterior</Link> : <span />}
          <span className="text-sm text-stone-600">Página {page} de {pages}</span>
          {page < pages ? <Link href={qs(page + 1)} className="btn-secondary">Próxima</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
