"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, safePath, withParams } from "@/lib/db-errors";
import type { ActionState } from "@/lib/validation/schemas";

const reportSchema = z.object({
  target_type: z.enum(["MESSAGE", "PHOTO"]),
  target_id: z.string().uuid(),
  reason: z.enum(["OFENSIVO", "SPAM", "PRIVACIDADE", "INADEQUADO", "OUTRO"], { errorMap: () => ({ message: "Escolha um motivo." }) }),
  details: z.string().trim().max(500, "Máximo de 500 caracteres.").optional().or(z.literal("")),
});

/** Denuncia uma mensagem do chat ou uma foto para a administração. */
export async function reportContent(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = reportSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  const v = parsed.data;
  if (v.reason === "OUTRO" && !v.details) return { message: "Conte rapidamente o motivo da denúncia." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("report_content", {
    p_type: v.target_type, p_target: v.target_id, p_reason: v.reason, p_details: v.details || null,
  });
  if (error) return { message: dbMessage(error, "Não foi possível enviar a denúncia.") };
  return { ok: true, message: "Denúncia enviada. A administração vai analisar com cuidado." };
}

/** Transfere a liderança (pelo responsável ou por um administrador), com opção de sair do grupo. */
export async function transferLeadership(form: FormData) {
  const somaId = String(form.get("soma_id"));
  const leave = form.get("leave") === "1";
  const back = safePath(form.get("back"), `/somas/${somaId}/membros`);
  const newLeader = String(form.get("new_leader") ?? "");
  if (!newLeader) redirect(withParams(back, { erro: "Escolha o novo responsável." }));

  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_leadership", { p_soma: somaId, p_new_leader: newLeader, p_leave: leave });
  revalidatePath("/", "layout");
  if (error) redirect(withParams(back, { erro: dbMessage(error, "Não foi possível transferir a liderança.") }));
  if (leave) redirect("/meus-somas?saiu=1");
  redirect(withParams(back, { ok: "Liderança transferida." }));
}

/** Grava a lista de presença de um encontro. */
export async function saveAttendance(_: ActionState, form: FormData): Promise<ActionState> {
  const somaId = String(form.get("soma_id"));
  const meetingId = String(form.get("meeting_id"));
  const present = form.getAll("present").map(String).filter((id) => z.string().uuid().safeParse(id).success);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_meeting_attendance", { p_meeting: meetingId, p_present: present });
  if (error) return { message: dbMessage(error, "Não foi possível salvar a presença.") };
  revalidatePath(`/somas/${somaId}`, "layout");
  return { ok: true, message: `Presença salva: ${present.length} ${present.length === 1 ? "pessoa presente" : "pessoas presentes"}.` };
}

const dataRequestSchema = z.object({
  kind: z.enum(["CORRECTION", "DELETION"], { errorMap: () => ({ message: "Escolha o tipo de pedido." }) }),
  details: z.string().trim().min(5, "Descreva o pedido (mín. 5 caracteres).").max(1000, "Máximo de 1000 caracteres."),
});

/** Pedido do titular (LGPD): correção ou exclusão de dados. */
export async function requestDataChange(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = dataRequestSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (errors[String(i.path[0])] ??= i.message));
    return { errors };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_data_change", { p_kind: parsed.data.kind, p_details: parsed.data.details });
  if (error) return { message: dbMessage(error, "Não foi possível enviar o pedido.") };
  revalidatePath("/perfil");
  return { ok: true, message: "Pedido enviado. Você será avisado quando a administração responder." };
}
