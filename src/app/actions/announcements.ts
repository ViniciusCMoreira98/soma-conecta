"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withParams } from "@/lib/db-errors";
import { zodErrors, type ActionState } from "@/lib/validation/schemas";

const announcementSchema = z.object({
  title: z.string().trim().min(1, "Informe o título do aviso.").max(120, "Máximo de 120 caracteres."),
  body: z.string().trim().min(1, "Escreva o aviso.").max(2000, "Máximo de 2000 caracteres."),
});

/** Publica um aviso para os membros do SOMA (somente o responsável, garantido por RLS). */
export async function createAnnouncement(_: ActionState, form: FormData): Promise<ActionState> {
  const somaId = String(form.get("soma_id"));
  const parsed = announcementSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { error } = await supabase.from("soma_announcements").insert({ soma_id: somaId, author_id: user.id, ...parsed.data });
  if (error) return { message: "Não foi possível publicar o aviso. Verifique se você é o responsável deste SOMA." };
  revalidatePath(`/somas/${somaId}`, "layout");
  return { ok: true, message: "Aviso publicado para os membros." };
}

export async function deleteAnnouncement(form: FormData) {
  const somaId = String(form.get("soma_id"));
  const back = `/somas/${somaId}/avisos`;
  const supabase = await createClient();
  const { error } = await supabase.from("soma_announcements").delete().eq("id", String(form.get("announcement_id"))).eq("soma_id", somaId);
  revalidatePath(`/somas/${somaId}`, "layout");
  if (error) redirect(withParams(back, { erro: "Não foi possível remover o aviso." }));
  redirect(back);
}
