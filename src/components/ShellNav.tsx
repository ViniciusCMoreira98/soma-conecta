"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Compass, Home, LogOut, Settings, ShieldCheck, Users } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";

export default function ShellNav({
  userId, isAdmin, initialUnread, children,
}: { userId: string; isAdmin: boolean; initialUnread: number; children: React.ReactNode }) {
  const supabase = useRef(createClient()).current;
  const pathname = usePathname();
  const [unread, setUnread] = useState(initialUnread);

  // O servidor envia a contagem a cada navegação; o Realtime mantém o selo atualizado entre elas.
  useEffect(() => setUnread(initialUnread), [initialUnread]);
  useEffect(() => {
    const refresh = async () => {
      const { count } = await supabase.from("notifications")
        .select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null);
      if (typeof count === "number") setUnread(count);
    };
    const channel = supabase
      .channel(`notif:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, userId]);

  const links = [
    { href: "/encontrar", label: "Encontrar", icon: Compass, badge: 0 },
    { href: "/meus-somas", label: "Meus SOMAS", icon: Users, badge: 0 },
    { href: "/notificacoes", label: "Avisos", icon: Bell, badge: unread },
    { href: "/perfil", label: "Perfil", icon: Settings, badge: 0 },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: ShieldCheck, badge: 0 }] : []),
  ];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const badgeText = unread > 99 ? "99+" : String(unread);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/encontrar" className="flex items-center gap-2 font-bold text-soma-700">
            <Home className="h-5 w-5" aria-hidden /> SOMA Conecta
          </Link>
          {/* Atalhos no topo do celular: avisos e sair */}
          <div className="flex items-center md:hidden">
            <Link href="/notificacoes" className="relative flex h-11 w-11 items-center justify-center rounded-full text-stone-700"
              aria-label={unread ? `Avisos: ${unread} não lidos` : "Avisos"}>
              <Bell className="h-5 w-5" aria-hidden />
              {unread > 0 && (
                <span className="absolute right-0.5 top-0.5 min-w-[20px] rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-5 text-white" aria-hidden>
                  {badgeText}
                </span>
              )}
            </Link>
            <form action={signOut} onSubmit={(e) => { if (!window.confirm("Sair da sua conta?")) e.preventDefault(); }}>
              <button className="flex h-11 w-11 items-center justify-center rounded-full text-stone-700" aria-label="Sair da conta" title="Sair">
                <LogOut className="h-5 w-5" aria-hidden />
              </button>
            </form>
          </div>
          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {links.map(({ href, label, badge }) => (
              <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}
                className={`relative rounded-lg px-3 py-2 text-sm font-medium hover:bg-soma-50 ${isActive(href) ? "text-soma-800" : "text-stone-700"}`}>
                {label}
                {badge > 0 && (
                  <span className="ml-1 rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
                    {badgeText}<span className="sr-only"> não lidas</span>
                  </span>
                )}
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
              <Link href={href} aria-current={isActive(href) ? "page" : undefined}
                className={`relative flex min-h-[56px] min-w-[60px] flex-col items-center justify-center gap-0.5 px-2 text-[11px] font-medium ${isActive(href) ? "text-soma-700" : "text-stone-600"}`}>
                <Icon className="h-5 w-5" aria-hidden />
                {label}
                {badge > 0 && (
                  <span className="absolute right-1.5 top-1 min-w-[18px] rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-[18px] text-white">
                    {badgeText}<span className="sr-only"> não lidas</span>
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
