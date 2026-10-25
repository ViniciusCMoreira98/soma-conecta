import Link from "next/link";
import { privateProfiles } from "@/lib/profiles";
import { notFound } from "next/navigation";
import { Alert, Avatar, ConfirmForm, StatusBadge } from "@/components/ui";
import { transferLeadership } from "@/app/actions/community";
import { requireAdmin } from "@/lib/auth";
import { ACCOUNT_STATUS_LABEL, FREQUENCY_LABEL, STATUS_LABEL, WEEKDAY_LABEL, formatDate, formatTime } from "@/lib/labels";

export const metadata = { title: "Membros do SOMA" };

export default async function AdminSomaPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string; todos?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: soma } = await supabase.from("somas")
    .select("id, name, description, neighborhood, location_hint, weekday, start_time, end_time, frequency, status, cover_url, accepting_members, created_at")
    .eq("id", id).maybeSingle();
  if (!soma) notFound();

  let q = supabase.from("soma_members")
    .select("user_id, role, status, joined_at")
    .eq("soma_id", id).order("role").order("joined_at");
  if (sp.todos !== "1") q = q.eq("status", "ACTIVE");
  const [{ data: members }, { count: meetings }, { count: pending }] = await Promise.all([
    q,
    supabase.from("meetings").select("id", { count: "exact", head: true }).eq("soma_id", id),
    supabase.from("soma_join_requests").select("id", { count: "exact", head: true }).eq("soma_id", id).eq("status", "PENDING"),
  ]);

  type P = { full_name: string | null; email: string; phone: string | null; age: number | null; avatar_url: string | null; status: string };
  const contacts = await privateProfiles(supabase, (members ?? []).map((m) => m.user_id));
  const list = (members ?? []).map((m) => ({ ...m, p: contacts.get(m.user_id) as P }));
  const activeMembers = list.filter((m) => m.status === "ACTIVE" && m.role === "MEMBER" && m.p?.status === "ACTIVE");
  const back = `/admin/somas/${id}`;

  return (
    <div className="space-y-4">
      <Link href="/admin/somas" className="text-sm font-medium text-soma-700 underline">← SOMAS</Link>
      {sp.erro && <Alert tone="error">{sp.erro}</Alert>}
      {sp.ok && <Alert tone="success">{sp.ok === "1" ? "Alteração realizada." : sp.ok}</Alert>}

      <section className="card space-y-2 text-sm text-stone-700">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold text-stone-900">{soma.name}</h2>
          <StatusBadge {...STATUS_LABEL[soma.status]} />
          {!soma.accepting_members && <StatusBadge text="Não aceita membros" tone="stone" />}
        </div>
        <p>{soma.neighborhood}{soma.location_hint ? ` · ${soma.location_hint}` : ""}</p>
        <p>{WEEKDAY_LABEL[soma.weekday]} às {formatTime(soma.start_time)}{soma.end_time ? `–${formatTime(soma.end_time)}` : ""} · {FREQUENCY_LABEL[soma.frequency]}</p>
        <p className="text-xs text-stone-500">Criado em {formatDate(soma.created_at)} · {meetings ?? 0} encontros · {pending ?? 0} solicitações de entrada pendentes</p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">{sp.todos === "1" ? "Todos os vínculos" : `Membros ativos (${list.length})`}</h3>
        <Link href={sp.todos === "1" ? back : `${back}?todos=1`} className="text-sm font-semibold text-soma-700 underline">
          {sp.todos === "1" ? "Mostrar só ativos" : "Incluir quem saiu ou foi removido"}
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl2 border border-stone-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="px-4 py-3">Nome</th><th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Papel</th><th className="px-4 py-3">Entrada</th><th className="px-4 py-3">Conta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {list.map((m) => (
              <tr key={m.user_id} className={m.status !== "ACTIVE" ? "text-stone-400" : ""}>
                <td className="px-4 py-3">
                  <Link href={`/admin/usuarios/${m.user_id}`} className="flex items-center gap-2 font-semibold hover:underline">
                    <Avatar name={m.p?.full_name} url={m.p?.avatar_url} size={32} /> {m.p?.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3">{m.p?.email}<br /><span className="text-xs">{m.p?.phone}{m.p?.age ? ` · ${m.p.age} anos` : ""}</span></td>
                <td className="px-4 py-3">
                  {m.role === "LEADER" ? <StatusBadge text="Responsável" tone="green" /> : "Membro"}
                  {m.status !== "ACTIVE" && <span className="block text-xs">{m.status === "LEFT" ? "saiu" : "removido"}</span>}
                </td>
                <td className="px-4 py-3">{formatDate(m.joined_at)}</td>
                <td className="px-4 py-3"><StatusBadge {...ACCOUNT_STATUS_LABEL[m.p?.status ?? "ACTIVE"]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <p className="p-6 text-center text-sm text-stone-600">Nenhum membro.</p>}
      </div>

      {soma.status === "APPROVED" && (
        <section className="card space-y-3">
          <h3 className="font-bold">Transferir liderança</h3>
          {activeMembers.length ? (
            <ConfirmForm action={transferLeadership} message="Transferir a liderança deste SOMA? O responsável atual continuará como membro e será avisado.">
              <input type="hidden" name="soma_id" value={id} />
              <input type="hidden" name="back" value={back} />
              <div className="flex flex-col gap-2 sm:flex-row">
                <select name="new_leader" required defaultValue="" aria-label="Novo responsável" className="input">
                  <option value="" disabled>Escolha o novo responsável…</option>
                  {activeMembers.map((m) => <option key={m.user_id} value={m.user_id}>{m.p?.full_name}</option>)}
                </select>
                <button className="btn-primary">Transferir</button>
              </div>
            </ConfirmForm>
          ) : (
            <p className="text-sm text-stone-600">Não há outros membros ativos para assumir a liderança.</p>
          )}
        </section>
      )}
    </div>
  );
}
