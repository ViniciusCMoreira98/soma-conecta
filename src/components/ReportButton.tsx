"use client";

import { useRef } from "react";
import { Flag } from "lucide-react";
import { reportContent } from "@/app/actions/community";
import { Alert, SubmitButton, useFormAction } from "@/components/ui";
import { REPORT_REASON_LABEL } from "@/lib/labels";


/** Botão "Denunciar" com uma janela para escolher o motivo. Usado no chat e nas fotos. */
export default function ReportButton({
  targetType, targetId, className = "", label = "Denunciar",
}: { targetType: "MESSAGE" | "PHOTO"; targetId: string; className?: string; label?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action] = useFormAction(reportContent);
  const what = targetType === "MESSAGE" ? "mensagem" : "foto";

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={className}
        aria-label={`Denunciar ${what}`} title={`Denunciar ${what}`}>
        <Flag className="h-3.5 w-3.5" aria-hidden /> {label && <span>{label}</span>}
      </button>
      <dialog ref={dialog} className="m-auto w-[min(92vw,28rem)] rounded-xl2 p-0 backdrop:bg-black/50"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        <div className="space-y-4 p-5 text-left text-stone-800">
          <h2 className="text-lg font-bold text-soma-900">Denunciar {what}</h2>
          {state.ok ? (
            <>
              <Alert tone="success">{state.message}</Alert>
              <button type="button" className="btn-secondary w-full" onClick={() => dialog.current?.close()}>Fechar</button>
            </>
          ) : (
            <form action={action} className="space-y-4">
              <input type="hidden" name="target_type" value={targetType} />
              <input type="hidden" name="target_id" value={targetId} />
              {state.message && <Alert tone="error">{state.message}</Alert>}
              <fieldset className="space-y-2">
                <legend className="label">Qual é o problema?</legend>
                {Object.entries(REPORT_REASON_LABEL).map(([k, v]) => (
                  <label key={k} className="flex min-h-[40px] items-center gap-3 text-sm">
                    <input type="radio" name="reason" value={k} defaultChecked={state.values?.reason === k} required className="h-5 w-5 accent-soma-600" /> {v}
                  </label>
                ))}
              </fieldset>
              <div>
                <label htmlFor={`details-${targetId}`} className="label">Detalhes (opcional)</label>
                <textarea id={`details-${targetId}`} name="details" rows={3} maxLength={500} defaultValue={state.values?.details} className="input py-2" />
              </div>
              <p className="text-xs text-stone-500">Só a administração vê a denúncia. Quem publicou não saberá quem denunciou.</p>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => dialog.current?.close()}>Cancelar</button>
                <SubmitButton variant="danger" pendingText="Enviando…" className="flex-1">Enviar denúncia</SubmitButton>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
