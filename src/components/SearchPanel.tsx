"use client";

import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";

/**
 * Depois de uma busca, recolhe o formulário num resumo com "Refazer busca", para que os resultados
 * apareçam logo na tela (principalmente no celular). A página passa uma `key` por busca: a cada nova
 * busca o componente é recriado e volta a ficar recolhido.
 */
export default function SearchPanel({ searched, summary, children }: { searched: boolean; summary: string; children: ReactNode }) {
  const [open, setOpen] = useState(!searched);
  if (open) return <>{children}</>;
  return (
    <div className="card mt-5 flex flex-wrap items-center justify-between gap-3">
      <p className="flex min-w-0 items-center gap-2 text-sm text-stone-700">
        <Search className="h-4 w-4 shrink-0 text-soma-600" aria-hidden />
        <span className="truncate"><span className="font-semibold">Busca:</span> {summary}</span>
      </p>
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary w-full sm:w-auto">Refazer busca</button>
    </div>
  );
}
