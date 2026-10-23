import Link from "next/link";
import { Bell, Compass, Home, Settings, ShieldCheck, Users } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import type { Profile } from "@/lib/auth";

export default function AppShell({
  profile, unread = 0, children,
}: { profile: Profile; unread?: number; children: React.ReactNode }) {
  const isAdmin = profile.role === "ADMIN";
  const links = [
    { href: "/encontrar", label: "Encontrar", icon: Compass },
    { href: "/meus-somas", label: "Meus SOMAS", icon: Users },
    { href: "/notificacoes", label: "Avisos", icon: Bell, badge: unread },
    { href: "/perfil", label: "Perfil", icon: Settings },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/encontrar" className="flex items-center gap-2 font-bold text-soma-700">
            <Home className="h-5 w-5" aria-hidden /> SOMA Conecta
          </Link>
          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {links.map(({ href, label, badge }) => (
              <Link key={href} href={href} className="relative rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-soma-50">
                {label}
                {!!badge && <span className="ml-1 rounded-full bg-soma-600 px-1.5 text-xs text-white">{badge}</span>}
              </Link>
            ))}
            <form action={signOut}>
              <button className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100">Sair</button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>

      {/* Navegação inferior no celular, com áreas de toque confortáveis */}
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white md:hidden">
        <ul className="mx-auto flex max-w-md justify-around">
          {links.map(({ href, label, icon: Icon, badge }) => (
            <li key={href}>
              <Link href={href} className="relative flex min-h-[56px] min-w-[60px] flex-col items-center justify-center gap-0.5 px-2 text-[11px] font-medium text-stone-600">
                <Icon className="h-5 w-5" aria-hidden />
                {label}
                {!!badge && <span className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full bg-soma-600" aria-label={`${badge} não lidas`} />}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
