import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Painel administrativo" };

export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc("admin_stats");
  const s = (data ?? {}) as Record<string, number>;
  const cards = [
    { label: "SOMAS aprovados", value: s.somas_approved },
    { label: "Cadastros pendentes", value: s.registrations_pending },
    { label: "Usuários", value: s.users },
    { label: "Membros em grupos", value: s.memberships },
    { label: "Reuniões registradas", value: s.meetings },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {cards.map((c) => (
        <li key={c.label} className="card">
          <p className="text-3xl font-extrabold text-soma-800">{c.value ?? "–"}</p>
          <p className="mt-1 text-sm text-stone-600">{c.label}</p>
        </li>
      ))}
    </ul>
  );
}
