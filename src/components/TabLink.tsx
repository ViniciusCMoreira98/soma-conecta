"use client";

import Link, { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

/** Indicador exibido assim que a aba é clicada, enquanto o servidor monta a página. */
function Pending() {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className="ml-1.5 h-3.5 w-3.5 animate-spin text-soma-600" aria-label="Carregando" /> : null;
}

export default function TabLink({ href, active, label, children }: { href: string; active: boolean; label: string; children?: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-[44px] items-center border-b-2 px-3 text-sm font-semibold ${
        active ? "border-soma-600 text-soma-800" : "border-transparent text-stone-600 hover:text-stone-900"
      }`}
    >
      {label}
      {children}
      <Pending />
    </Link>
  );
}
