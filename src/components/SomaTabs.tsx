import Link from "next/link";

export default function SomaTabs({ somaId, active, isLeader }: { somaId: string; active: string; isLeader: boolean }) {
  const tabs = [
    { key: "geral", href: `/somas/${somaId}`, label: "Visão geral" },
    { key: "reunioes", href: `/somas/${somaId}/reunioes`, label: "Reuniões" },
    { key: "fotos", href: `/somas/${somaId}/fotos`, label: "Fotos" },
    { key: "membros", href: `/somas/${somaId}/membros`, label: "Membros" },
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
            <Link
              href={t.href}
              aria-current={active === t.key ? "page" : undefined}
              className={`inline-flex min-h-[44px] items-center border-b-2 px-3 text-sm font-semibold ${
                active === t.key ? "border-soma-600 text-soma-800" : "border-transparent text-stone-600 hover:text-stone-900"
              }`}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
