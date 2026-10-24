import { getSessionProfile } from "@/lib/auth";
import UnreadBadge from "@/components/UnreadBadge";
import TabLink from "@/components/TabLink";

export default async function SomaTabs({ somaId, active, isLeader }: { somaId: string; active: string; isLeader: boolean }) {
  // Sessão já carregada pela página (memorizada por requisição): sem nova ida ao Supabase Auth.
  const session = await getSessionProfile();
  const { data } = session
    ? await session.supabase.rpc("soma_unread_counts", { p_soma: somaId }).maybeSingle<{ chat_unread: number; avisos_unread: number }>()
    : { data: null };
  const user = session?.user;
  const unread = {
    chat: { initial: data?.chat_unread ?? 0, table: "messages", authorField: "sender_id" },
    avisos: { initial: data?.avisos_unread ?? 0, table: "soma_announcements", authorField: "author_id" },
  } as const;
  const tabs = [
    { key: "geral", href: `/somas/${somaId}`, label: "Visão geral" },
    { key: "reunioes", href: `/somas/${somaId}/reunioes`, label: "Encontros" },
    { key: "fotos", href: `/somas/${somaId}/fotos`, label: "Fotos" },
    { key: "membros", href: `/somas/${somaId}/membros`, label: "Membros" },
    { key: "avisos", href: `/somas/${somaId}/avisos`, label: "Avisos" },
    { key: "chat", href: `/somas/${somaId}/chat`, label: "Chat" },
    ...(isLeader
      ? [
          { key: "participacao", href: `/somas/${somaId}/participacao`, label: "Participação" },
          { key: "solicitacoes", href: `/somas/${somaId}/solicitacoes`, label: "Solicitações" },
          { key: "configuracoes", href: `/somas/${somaId}/configuracoes`, label: "Configurações" },
        ]
      : []),
  ];
  return (
    <nav aria-label="Seções do SOMA" className="-mx-4 mt-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-2 border-b border-stone-200">
        {tabs.map((t) => (
          <li key={t.key}>
            <TabLink href={t.href} active={active === t.key} label={t.label}>
              {active !== t.key && user && (t.key === "chat" || t.key === "avisos") && (
                <UnreadBadge somaId={somaId} userId={user.id} {...unread[t.key]} />
              )}
            </TabLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
