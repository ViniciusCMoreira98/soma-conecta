"use client";

import { createAnnouncement } from "@/app/actions/announcements";
import { Alert, Field, SubmitButton, useFormAction } from "@/components/ui";

export default function AnnouncementForm({ somaId }: { somaId: string }) {
  const [state, action] = useFormAction(createAnnouncement);
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="card space-y-4">
      <input type="hidden" name="soma_id" value={somaId} />
      <h2 className="font-bold text-stone-900">Novo aviso</h2>
      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      <Field label="Título" name="title" error={e.title}>
        <input id="title" name="title" maxLength={120} defaultValue={state.values?.title} required className="input" />
      </Field>
      <Field label="Mensagem" name="body" error={e.body} hint="Visível apenas para os membros deste SOMA.">
        <textarea id="body" name="body" rows={4} maxLength={2000} defaultValue={state.values?.body} required className="input py-2" />
      </Field>
      <SubmitButton pendingText="Publicando…">Publicar aviso</SubmitButton>
    </form>
  );
}
