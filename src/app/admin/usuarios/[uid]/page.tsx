import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Avatar, ConfirmForm, StatusBadge } from "@/components/ui";
import { anonymizeUser, setUserStatus } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { ACCOUNT_STATUS_LABEL, AUDIT_ACTION_LABEL, formatDate, formatDateTime } from "@/lib/labels";

export const metadata = { title: "Usuário" };

export default async function AdminUsuarioPage({
  params, searchParams,
}: { params: Promise<{ uid: string }>; searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { uid } = await params;
  const sp = await searchParams;
  const { supabase, user: me } = await requireAdmin();

  const { data: u } = await supabase.from("profiles")
    .select("id, full_name, email, phone, age, has_bases, avatar_url, role, status, created_at").eq("id", uid).maybeSingle();
  if (!u) notFound();

  const [{ data: memberships }, { data: history }] = await Promise.all([
    supabase.from("soma_members").select("soma_id, role, status, joined_at, soma:somas(name)")
      .eq("user_id", uid).order("joined_at", { ascending: false }),
    supabase.from("admin_audit_log").select("id, action, details, created_at, actor:profiles!admin_audit_log_actor_id_fkey(full_name)")
      .eq("target_type", "user").eq("target_id", uid).order("created_at", { ascending: false }).limit(50),
  ]);
  const back = `/admin/usuarios/${uid}`;
  const isSelf = uid === me.id;
  const active = memberships?.filter((m) => m.status === "ACTIVE") ?? [];
  const leads = active.filter((m) => m.role === "LEADER");

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/admin/usuarios" className="text-sm font-medium text-soma-700 underline">← Usuários</Link>
      {sp.erro && <Alert tone="error">{sp.erro}</Alert>}
      {sp.ok && <Alert tone="success">{sp.ok}</Alert>}

      <section className="card flex flex-wrap items-start gap-4">
        <Avatar name={u.full_name} url={u.avatar_url} size={64} />
        <div className="min-w-0 flex-1 space-y-1 text-sm text-stone-700">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-stone-900">{u.full_name ?? "(perfil incompleto)"}</h2>
            {u.role === "ADMIN" && <StatusBadge text="Admin" tone="green" />}
            <StatusBadge {...ACCOUNT_STATUS_LABEL[u.status]} />
          </div>
          <p>{u.email}</p>
          <p>{u.phone ?? "Sem celular"} · {u.age ? `${u.age} anos` : "idade não informada"} · Bases: {u.has_bases == null ? "—" : u.has_bases ? "Sim" : "Não"}</p>
          <p className="text-xs text-stone-500">Conta criada em {formatDate(u.created_at)}</p>
        </div>
      </section>

      <section className="card space-y-3">
        <h3 className="font-bold">SOMAS</h3>
        {!memberships?.length ? <p className="text-sm text-stone-600">Não participa de nenhum SOMA.</p> : (
          <ul className="divide-y divide-stone-100 text-sm">
            {memberships.map((m) => (
              <li key={m.soma_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={`/admin/somas/${m.soma_id}`} className="font-medium text-soma-800 underline">{(m.soma as unknown as { name: string })?.name}</Link>
                <span className="text-xs text-stone-500">
                  {m.role === "LEADER" ? "Responsável" : "Membro"} · {m.status === "ACTIVE" ? "ativo" : m.status === "LEFT" ? "saiu" : "removido"} · desde {formatDate(m.joined_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!isSelf && (
        <section className="card space-y-3">
          <h3 className="font-bold">Situação da conta</h3>
          {u.status === "ACTIVE" ? (
            <ConfirmForm action={setUserStatus} message={`Suspender a conta de ${u.full_name ?? u.email}? A pessoa perde o acesso imediatamente.`}>
              <input type="hidden" name="user_id" value={uid} />
              <input type="hidden" name="suspend" value="1" />
              <input type="hidden" name="back" value={back} />
              {!!leads.length && (
                <p className="mb-2 text-sm text-amber-800">
                  Atenção: é responsável por {leads.map((l) => (l.soma as unknown as { name: string })?.name).join(", ")}. Com a conta suspensa o grupo
                  fica sem responsável ativo — considere transferir a liderança antes.
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <input name="reason" required minLength={5} placeholder="Motivo da suspensão (fica no histórico)" aria-label="Motivo da suspensão" className="input" />
                <button className="btn-danger">Suspender</button>
              </div>
            </ConfirmForm>
          ) : (
            <ConfirmForm action={setUserStatus} message="Reativar esta conta?">
              <input type="hidden" name="user_id" value={uid} />
              <input type="hidden" name="suspend" value="0" />
              <input type="hidden" name="back" value={back} />
              <input name="reason" placeholder="Observação (opcional)" aria-label="Observação" className="input mb-2" />
              <button className="btn-primary">Reativar conta</button>
            </ConfirmForm>
          )}
        </section>
      )}

      <section className="card space-y-3">
        <h3 className="font-bold">Histórico de alterações</h3>
        {!history?.length ? <p className="text-sm text-stone-600">Nenhuma ação administrativa registrada.</p> : (
          <ol className="space-y-2 text-sm">
            {history.map((h) => {
              const d = (h.details ?? {}) as Record<string, string | null>;
              return (
                <li key={h.id} className="border-l-2 border-soma-200 pl-3">
                  <p className="font-semibold">{AUDIT_ACTION_LABEL[h.action] ?? h.action}</p>
                  <p className="text-xs text-stone-500">
                    {formatDateTime(h.created_at)} · por {(h.actor as unknown as { full_name: string })?.full_name ?? "administrador"}
                  </p>
                  {(d.reason || d.response) && <p className="text-stone-700">{d.reason ?? d.response}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {!isSelf && u.full_name !== "Usuário removido" && (
        <section className="card space-y-2 border-red-200">
          <h3 className="font-bold text-red-800">Excluir dados pessoais (LGPD)</h3>
          <p className="text-sm text-stone-600">
            Apaga nome, idade, celular, e-mail e foto, encerra a participação nos SOMAS e desativa a conta. Use apenas para atender
            um pedido de exclusão. Não pode ser desfeito.
          </p>
          <ConfirmForm action={anonymizeUser} message="Excluir definitivamente os dados pessoais deste usuário? Esta ação não pode ser desfeita.">
            <input type="hidden" name="user_id" value={uid} />
            <input type="hidden" name="back" value={back} />
            <button className="btn-danger">Excluir dados pessoais</button>
          </ConfirmForm>
        </section>
      )}
    </div>
  );
}
