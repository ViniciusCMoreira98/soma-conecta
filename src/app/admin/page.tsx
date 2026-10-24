import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Painel administrativo" };

export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc("admin_stats");
  const s = (data ?? {}) as Record<string, number>;
  const cards = [
    { label: "Cadastros pendentes", value: s.registrations_pending, href: "/admin/solicitacoes", alert: s.registrations_pending > 0 },
    { label: "Denúncias abertas", value: s.reports_open, href: "/admin/denuncias", alert: s.reports_open > 0 },
    { label: "Pedidos LGPD pendentes", value: s.data_requests_pending, href: "/admin/lgpd", alert: s.data_requests_pending > 0 },
    { label: "SOMAS aprovados", value: s.somas_approved, href: "/admin/somas?status=APPROVED" },
    { label: "Usuários", value: s.users, href: "/admin/usuarios" },
    { label: "Contas suspensas", value: s.users_suspended, href: "/admin/usuarios?status=SUSPENDED" },
    { label: "Membros em grupos", value: s.memberships },
    { label: "Encontros realizados", value: s.meetings },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => {
        const inner = (
          <>
            <p className={`text-3xl font-extrabold ${c.alert ? "text-amber-700" : "text-soma-800"}`}>{c.value ?? "–"}</p>
            <p className="mt-1 text-sm text-stone-600">{c.label}</p>
          </>
        );
        return (
          <li key={c.label}>
            {c.href
              ? <Link href={c.href} className={`card block h-full hover:border-soma-300 ${c.alert ? "border-amber-300" : ""}`}>{inner}</Link>
              : <div className="card h-full">{inner}</div>}
          </li>
        );
      })}
    </ul>
  );
}
