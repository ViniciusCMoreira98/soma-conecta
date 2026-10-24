"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { zodErrors, type ActionState } from "@/lib/validation/schemas";
import { todayLocal } from "@/lib/labels";
import { isUploadedImagePath } from "@/lib/upload-path";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.").optional().or(z.literal(""));

const meetingSchema = z
  .object({
    meeting_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data do encontro.")
      // Datas futuras viram encontros agendados (até 1 ano à frente).
      .refine((d) => d <= new Date(Date.now() + 366 * 86400000).toISOString().slice(0, 10), "Agende no máximo com 1 ano de antecedência."),
    start_time: time,
    end_time: time,
    title: z.string().trim().max(120, "Máximo de 120 caracteres.").optional().or(z.literal("")),
    description: z.string().trim().max(2000, "Máximo de 2000 caracteres.").optional().or(z.literal("")),
    notes: z.string().trim().max(2000, "Máximo de 2000 caracteres.").optional().or(z.literal("")),
  })
  .refine((v) => !v.start_time || !v.end_time || v.end_time > v.start_time, {
    path: ["end_time"],
    message: "O término deve ser depois do início.",
  });

function payload(v: z.infer<typeof meetingSchema>) {
  return {
    meeting_date: v.meeting_date,
    start_time: v.start_time || null,
    end_time: v.end_time || null,
    title: v.title || null,
    description: v.description || null,
    notes: v.notes || null,
  };
}

export async function createMeeting(_: ActionState, form: FormData): Promise<ActionState> {
  const somaId = String(form.get("soma_id"));
  const parsed = meetingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data, error } = await supabase
    .from("meetings")
    .insert({ soma_id: somaId, created_by: user.id, ...payload(parsed.data) })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { message: "Já existe um encontro registrado nesta data e horário." };
    return { message: "Não foi possível registrar o encontro. Verifique se você é o responsável deste SOMA." };
  }
  revalidatePath(`/somas/${somaId}/reunioes`);
  redirect(`/somas/${somaId}/reunioes/${data.id}?criada=1`);
}

export async function updateMeeting(_: ActionState, form: FormData): Promise<ActionState> {
  const somaId = String(form.get("soma_id"));
  const meetingId = String(form.get("meeting_id"));
  const parsed = meetingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("meetings").update(payload(parsed.data)).eq("id", meetingId).eq("soma_id", somaId);
  if (error) {
    if (error.code === "23505") return { message: "Já existe um encontro registrado nesta data e horário." };
    return { message: "Não foi possível salvar as alterações." };
  }
  revalidatePath(`/somas/${somaId}`, "layout");
  return { ok: true, message: "Encontro atualizado." };
}

export async function deleteMeeting(form: FormData) {
  const somaId = String(form.get("soma_id"));
  const meetingId = String(form.get("meeting_id"));
  const supabase = await createClient();

  const { data: photos } = await supabase.from("meeting_photos").select("storage_path").eq("meeting_id", meetingId);
  if (photos?.length) await supabase.storage.from("meeting-photos").remove(photos.map((p) => p.storage_path));

  const { error } = await supabase.from("meetings").delete().eq("id", meetingId).eq("soma_id", somaId);
  revalidatePath(`/somas/${somaId}`, "layout");
  if (error) redirect(`/somas/${somaId}/reunioes?erro=${encodeURIComponent("Não foi possível excluir o encontro.")}`);
  redirect(`/somas/${somaId}/reunioes?ok=1`);
}

const MAX_PHOTOS = 10;

/**
 * Registra as fotos de um encontro já enviadas pelo navegador ao Storage em meeting-photos/{soma}/{encontro}/...
 * (o envio direto evita o limite de tamanho de requisição da hospedagem). Só o responsável, garantido por RLS.
 */
export async function savePhotos(somaId: string, meetingId: string, paths: string[]): Promise<ActionState> {
  if (!paths.length || paths.length > MAX_PHOTOS) return { message: `Envie de 1 a ${MAX_PHOTOS} fotos por vez.` };
  if (!paths.every((p) => isUploadedImagePath(p, `${somaId}/${meetingId}`))) return { message: "Arquivo inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: meeting } = await supabase.from("meetings").select("id, meeting_date").eq("id", meetingId).eq("soma_id", somaId).maybeSingle();
  if (!meeting) return { message: "Encontro não encontrado." };
  if (meeting.meeting_date > todayLocal()) return { message: "As fotos podem ser enviadas a partir do dia do encontro." };

  const { error } = await supabase.from("meeting_photos").insert(
    paths.map((path) => ({ meeting_id: meetingId, soma_id: somaId, storage_path: path, uploaded_by: user.id })),
  );
  if (error) return { message: "Não foi possível registrar as fotos. Verifique se você é o responsável deste SOMA." };

  revalidatePath(`/somas/${somaId}`, "layout");
  return { ok: true, message: `${paths.length} foto(s) enviada(s) com sucesso.` };
}

export async function deletePhoto(form: FormData) {
  const somaId = String(form.get("soma_id"));
  const photoId = String(form.get("photo_id"));
  const back = String(form.get("back") ?? `/somas/${somaId}/fotos`);
  const supabase = await createClient();

  const { data: photo } = await supabase.from("meeting_photos").select("storage_path").eq("id", photoId).eq("soma_id", somaId).maybeSingle();
  if (photo) {
    await supabase.storage.from("meeting-photos").remove([photo.storage_path]);
    await supabase.from("meeting_photos").delete().eq("id", photoId).eq("soma_id", somaId);
  }
  revalidatePath(`/somas/${somaId}`, "layout");
  redirect(back.startsWith("/somas/") ? back : `/somas/${somaId}/fotos`);
}
