"use client";

import { useActionState } from "react";
import { createMeeting, updateMeeting, uploadPhotos } from "@/app/actions/meetings";
import { Alert, Field, SubmitButton, useFormAction } from "@/components/ui";
import type { ActionState } from "@/lib/validation/schemas";

const initial: ActionState = {};

export function MeetingForm({
  somaId, meeting,
}: {
  somaId: string;
  meeting?: { id: string; meeting_date: string; start_time: string | null; end_time: string | null; title: string | null; description: string | null; notes: string | null };
}) {
  const [state, action] = useFormAction(meeting ? updateMeeting : createMeeting);
  const v = state.values;
  const e = state.errors ?? {};
  const maxDate = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  return (
    <form action={action} noValidate className="card space-y-5">
      <input type="hidden" name="soma_id" value={somaId} />
      {meeting && <input type="hidden" name="meeting_id" value={meeting.id} />}
      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Data" name="meeting_date" error={e.meeting_date} hint="Data passada registra um encontro realizado; data futura agenda o próximo.">
          <input id="meeting_date" name="meeting_date" type="date" max={maxDate} defaultValue={v?.meeting_date ?? meeting?.meeting_date} required className="input" />
        </Field>
        <Field label="Início (opcional)" name="start_time" error={e.start_time}>
          <input id="start_time" name="start_time" type="time" defaultValue={v?.start_time ?? meeting?.start_time?.slice(0, 5) ?? ""} className="input" />
        </Field>
        <Field label="Término (opcional)" name="end_time" error={e.end_time}>
          <input id="end_time" name="end_time" type="time" defaultValue={v?.end_time ?? meeting?.end_time?.slice(0, 5) ?? ""} className="input" />
        </Field>
      </div>
      <Field label="Tema ou título (opcional)" name="title" error={e.title}>
        <input id="title" name="title" maxLength={120} defaultValue={v?.title ?? meeting?.title ?? ""} className="input" />
      </Field>
      <Field label="Resumo (opcional)" name="description" error={e.description}>
        <textarea id="description" name="description" rows={4} maxLength={2000} defaultValue={v?.description ?? meeting?.description ?? ""} className="input py-2" />
      </Field>
      <Field label="Observações (opcional)" name="notes" error={e.notes}>
        <textarea id="notes" name="notes" rows={3} maxLength={2000} defaultValue={v?.notes ?? meeting?.notes ?? ""} className="input py-2" />
      </Field>
      <SubmitButton pendingText="Salvando…">{meeting ? "Salvar alterações" : "Salvar encontro"}</SubmitButton>
    </form>
  );
}

export function PhotoUploader({ somaId, meetingId }: { somaId: string; meetingId: string }) {
  const [state, action] = useActionState(uploadPhotos, initial);
  return (
    <form action={action} className="card space-y-4">
      <input type="hidden" name="soma_id" value={somaId} />
      <input type="hidden" name="meeting_id" value={meetingId} />
      <h3 className="font-bold text-soma-900">Enviar fotos</h3>
      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      <div>
        <label htmlFor="photos" className="label">Fotos (JPG, PNG ou WebP, até 5 MB cada, máx. 10)</label>
        <input id="photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required
          className="block w-full text-sm file:mr-3 file:min-h-[44px] file:rounded-xl file:border-0 file:bg-soma-100 file:px-4 file:font-semibold file:text-soma-800" />
      </div>
      <label className="flex items-start gap-3 text-sm text-stone-700">
        <input type="checkbox" name="consent" className="mt-0.5 h-5 w-5 accent-soma-600" />
        Confirmo que as pessoas que aparecem nas fotos concordam com a publicação para os membros deste SOMA.
      </label>
      <SubmitButton pendingText="Enviando fotos…">Enviar fotos</SubmitButton>
    </form>
  );
}
