"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, withParams } from "@/lib/db-errors";
import { zodErrors, type ActionState } from "@/lib/validation/schemas";

const prayerSchema = z.object({
  content: z.string().trim().min(1, "Escreva o seu pedido de oração.").max(1000, "Máximo de 1000 caracteres."),
});

/** Publica um pedido de oração para os membros do SOMA (qualquer membro, garantido por RLS). */
export async function createPrayer(_: ActionState, form: FormData): Promise<ActionState> {
  const somaId = String(form.get("soma_id"));
  const parsed = prayerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { error } = await supabase.from("prayer_requests").insert({
    soma_id: somaId, author_id: user.id, content: parsed.data.content, is_anonymous: form.get("is_anonymous") === "on",
  });
  if (error) return { message: "Não foi possível publicar o pedido. Verifique se você participa deste SOMA." };
  revalidatePath(`/somas/${somaId}/oracao`);
  return { ok: true, message: "Pedido publicado. Os membros do SOMA vão orar com você." };
}

const back = (somaId: string) => `/somas/${somaId}/oracao`;

/** "Estou orando" (liga/desliga). */
export async function togglePraying(form: FormData) {
  const somaId = String(form.get("soma_id"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("toggle_prayer_support", { p_request: String(form.get("prayer_id")) });
  if (error) redirect(withParams(back(somaId), { erro: dbMessage(error, "Não foi possível registrar.") }));
  revalidatePath(back(somaId));
}

/** O autor marca o pedido como respondido (ou volta a deixá-lo em aberto). */
export async function setPrayerAnswered(form: FormData) {
  const somaId = String(form.get("soma_id"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_prayer_answered", {
    p_request: String(form.get("prayer_id")), p_answered: form.get("answered") === "1",
  });
  if (error) redirect(withParams(back(somaId), { erro: dbMessage(error, "Não foi possível atualizar o pedido.") }));
  revalidatePath(back(somaId));
}

/** Remove o pedido (autor, responsável do SOMA ou administrador, conferido no banco). */
export async function deletePrayer(form: FormData) {
  const somaId = String(form.get("soma_id"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_prayer", { p_request: String(form.get("prayer_id")) });
  if (error) redirect(withParams(back(somaId), { erro: dbMessage(error, "Não foi possível remover o pedido.") }));
  revalidatePath(back(somaId));
}
