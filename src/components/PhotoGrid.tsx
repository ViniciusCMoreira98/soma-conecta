"use client";

import { useRef, useState } from "react";
import { deletePhoto } from "@/app/actions/meetings";
import ReportButton from "@/components/ReportButton";

export type GridPhoto = { id: string; url: string; caption?: string | null };

export default function PhotoGrid({
  photos, somaId, canDelete, back,
}: { photos: GridPhoto[]; somaId: string; canDelete: boolean; back: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState<GridPhoto | null>(null);

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p) => (
          <li key={p.id} className="group relative overflow-hidden rounded-xl bg-stone-100">
            <button
              type="button"
              className="block aspect-square w-full"
              aria-label={p.caption ? `Ampliar foto: ${p.caption}` : "Ampliar foto"}
              onClick={() => { setCurrent(p); dialog.current?.showModal(); }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption ?? "Foto do encontro"} loading="lazy" decoding="async" className="h-full w-full object-cover" />
            </button>
            {!canDelete && (
              <div className="absolute right-1 top-1">
                <ReportButton targetType="PHOTO" targetId={p.id} label=""
                  className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg bg-white/90 text-stone-600 shadow hover:text-red-700" />
              </div>
            )}
            {canDelete && (
              <form
                action={deletePhoto}
                onSubmit={(e) => { if (!window.confirm("Excluir esta foto?")) e.preventDefault(); }}
                className="absolute right-1 top-1"
              >
                <input type="hidden" name="soma_id" value={somaId} />
                <input type="hidden" name="photo_id" value={p.id} />
                <input type="hidden" name="back" value={back} />
                <button className="min-h-[36px] rounded-lg bg-white/90 px-2 text-xs font-semibold text-red-700 shadow">Excluir</button>
              </form>
            )}
          </li>
        ))}
      </ul>

      <dialog ref={dialog} onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto max-h-[92vh] max-w-[96vw] rounded-xl bg-transparent p-0 backdrop:bg-black/80">
        {current && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.url} alt={current.caption ?? "Foto do encontro"} className="max-h-[88vh] max-w-[94vw] rounded-xl object-contain" />
            <button onClick={() => dialog.current?.close()} className="btn-secondary absolute right-2 top-2 min-h-[40px]">Fechar</button>
          </div>
        )}
      </dialog>
    </>
  );
}
