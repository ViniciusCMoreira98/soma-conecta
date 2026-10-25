"use client";

import { createPrayer } from "@/app/actions/prayers";
import { Alert, Field, SubmitButton, useFormAction } from "@/components/ui";

export default function PrayerForm({ somaId }: { somaId: string }) {
  const [state, action] = useFormAction(createPrayer);
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="card space-y-4">
      <input type="hidden" name="soma_id" value={somaId} />
      <h2 className="font-bold text-stone-900">Fazer um pedido de oração</h2>
      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      <Field label="Pelo que podemos orar?" name="content" error={e.content} hint="Visível apenas para os membros deste SOMA.">
        <textarea id="content" name="content" rows={3} maxLength={1000} defaultValue={state.values?.content} required className="input py-2" />
      </Field>
      <label className="flex min-h-[44px] items-center gap-3 text-sm">
        <input type="checkbox" name="is_anonymous" defaultChecked={state.values?.is_anonymous === "on"} className="h-5 w-5 accent-soma-600" />
        Publicar sem mostrar meu nome
      </label>
      <SubmitButton pendingText="Publicando…">Publicar pedido</SubmitButton>
    </form>
  );
}
