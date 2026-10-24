"use client";

import { useActionState } from "react";
import { uploadAvatar, uploadCover } from "@/app/actions/media";
import { Alert, SubmitButton } from "@/components/ui";
import type { ActionState } from "@/lib/validation/schemas";

const initial: ActionState = {};

export function AvatarUploader() {
  const [state, action] = useActionState(uploadAvatar, initial);
  return (
    <form action={action} className="space-y-3">
      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      <label htmlFor="avatar" className="label">Nova foto (JPG, PNG ou WebP, até 2 MB)</label>
      <input id="avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" required
        className="block w-full text-sm file:mr-3 file:min-h-[44px] file:rounded-xl file:border-0 file:bg-soma-100 file:px-4 file:font-semibold file:text-soma-800" />
      <SubmitButton pendingText="Enviando…">Salvar foto</SubmitButton>
    </form>
  );
}

export function CoverUploader({ somaId }: { somaId: string }) {
  const [state, action] = useActionState(uploadCover, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="soma_id" value={somaId} />
      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      <label htmlFor="cover" className="label">Nova imagem (JPG, PNG ou WebP, até 5 MB; ideal na horizontal)</label>
      <input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" required
        className="block w-full text-sm file:mr-3 file:min-h-[44px] file:rounded-xl file:border-0 file:bg-soma-100 file:px-4 file:font-semibold file:text-soma-800" />
      <p className="text-xs text-stone-500">A capa aparece na busca para todos os usuários. Evite fotos em que pessoas possam ser identificadas sem consentimento.</p>
      <SubmitButton pendingText="Enviando…">Salvar capa</SubmitButton>
    </form>
  );
}
