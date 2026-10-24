"use client";

import { useActionState } from "react";
import { requestDataChange } from "@/app/actions/community";
import { Alert, Field, SubmitButton } from "@/components/ui";
import type { ActionState } from "@/lib/validation/schemas";

const initial: ActionState = {};

export default function DataRequestForm() {
  const [state, action] = useActionState(requestDataChange, initial);
  const e = state.errors ?? {};
  if (state.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message && <Alert tone="error">{state.message}</Alert>}
      <fieldset>
        <legend className="label">O que você precisa?</legend>
        <div className="space-y-1">
          <label className="flex min-h-[44px] items-center gap-3 text-sm">
            <input type="radio" name="kind" value="CORRECTION" className="h-5 w-5 accent-soma-600" />
            Corrigir um dado que não consigo alterar sozinho (ex.: e-mail)
          </label>
          <label className="flex min-h-[44px] items-center gap-3 text-sm">
            <input type="radio" name="kind" value="DELETION" className="h-5 w-5 accent-soma-600" />
            Excluir minha conta e meus dados pessoais
          </label>
        </div>
        {e.kind && <p role="alert" className="mt-1 text-sm text-red-700">{e.kind}</p>}
      </fieldset>
      <Field label="Descreva o pedido" name="details" error={e.details}>
        <textarea id="details" name="details" rows={3} maxLength={1000} className="input py-2" />
      </Field>
      <p className="text-xs text-stone-500">
        Na exclusão, seu nome, idade, celular, e-mail e foto são apagados e sua conta é desativada. As mensagens que você
        enviou continuam no chat como “Usuário removido”.
      </p>
      <SubmitButton pendingText="Enviando…">Enviar pedido</SubmitButton>
    </form>
  );
}
