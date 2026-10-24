"use client";

import { useActionState } from "react";
import { saveAttendance } from "@/app/actions/community";
import { Alert, Avatar, SubmitButton } from "@/components/ui";
import type { ActionState } from "@/lib/validation/schemas";

const initial: ActionState = {};

export default function AttendanceForm({
  somaId, meetingId, members, present, taken,
}: {
  somaId: string; meetingId: string; taken: boolean;
  members: { user_id: string; full_name: string | null; avatar_url: string | null }[];
  present: string[];
}) {
  const [state, action] = useActionState(saveAttendance, initial);
  return (
    <form action={action} className="card space-y-4">
      <input type="hidden" name="soma_id" value={somaId} />
      <input type="hidden" name="meeting_id" value={meetingId} />
      <div>
        <h3 className="font-bold text-soma-900">Presença</h3>
        <p className="text-sm text-stone-600">
          {taken ? "Presença registrada. Você pode corrigir a qualquer momento." : "Marque quem participou deste encontro."}
        </p>
      </div>
      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      <ul className="grid gap-1 sm:grid-cols-2">
        {members.map((m) => (
          <li key={m.user_id}>
            <label className="flex min-h-[48px] items-center gap-3 rounded-xl px-2 hover:bg-soma-50">
              <input type="checkbox" name="present" value={m.user_id} defaultChecked={present.includes(m.user_id)} className="h-5 w-5 accent-soma-600" />
              <Avatar name={m.full_name} url={m.avatar_url} size={32} />
              <span className="text-sm font-medium">{m.full_name}</span>
            </label>
          </li>
        ))}
      </ul>
      <SubmitButton pendingText="Salvando…">Salvar presença</SubmitButton>
    </form>
  );
}
