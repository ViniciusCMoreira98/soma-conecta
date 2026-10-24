import Link from "next/link";
import AppShell from "@/components/AppShell";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  const tabs = [
    { href: "/admin", label: "Painel" },
    { href: "/admin/solicitacoes", label: "Solicitações" },
    { href: "/admin/somas", label: "SOMAS" },
    { href: "/admin/usuarios", label: "Usuários" },
    { href: "/admin/denuncias", label: "Denúncias" },
    { href: "/admin/lgpd", label: "LGPD" },
    { href: "/admin/historico", label: "Histórico" },
  ];
  return (
    <AppShell profile={profile}>
      <h1 className="text-2xl font-extrabold text-soma-900">Administração</h1>
      <nav aria-label="Administração" className="-mx-4 mt-3 overflow-x-auto px-4">
        <ul className="flex min-w-max gap-2 border-b border-stone-200">
          {tabs.map((t) => (
            <li key={t.href}>
              <Link href={t.href} className="inline-flex min-h-[44px] items-center px-3 text-sm font-semibold text-stone-700 hover:text-soma-800">{t.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-5">{children}</div>
    </AppShell>
  );
}
