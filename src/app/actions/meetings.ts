"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { zodErrors, type ActionState } from "@/lib/validation/schemas";
import { todayLocal } from "@/lib/labels";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.").optional().or(z.literal(""));

const meetingSchema = z
  .object({
    meeting_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data da reunião.")
      // Datas futuras viram reuniões agendadas (até 1 ano à frente).
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
    if (error.code === "23505") return { message: "Já existe uma reunião registrada nesta data e horário." };
    return { message: "Não foi possível registrar a reunião. Verifique se você é o responsável deste SOMA." };
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
    if (error.code === "23505") return { message: "Já existe uma reunião registrada nesta data e horário." };
    return { message: "Não foi possível salvar as alterações." };
  }
  revalidatePath(`/somas/${somaId}`, "layout");
  return { ok: true, message: "Reunião atualizada." };
}

export async function deleteMeeting(form: FormData) {
  const somaId = String(form.get("soma_id"));
  const meetingId = String(form.get("meeting_id"));
  const supabase = await createClient();

  const { data: photos } = await supabase.from("meeting_photos").select("storage_path").eq("meeting_id", meetingId);
  if (photos?.length) await supabase.storage.from("meeting-photos").remove(photos.map((p) => p.storage_path));

  const { error } = await supabase.from("meetings").delete().eq("id", meetingId).eq("soma_id", somaId);
  revalidatePath(`/somas/${somaId}`, "layout");
  if (error) redirect(`/somas/${somaId}/reunioes?erro=${encodeURIComponent("Não foi possível excluir a reunião.")}`);
  redirect(`/somas/${somaId}/reunioes?ok=1`);
}

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 10;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function uploadPhotos(_: ActionState, form: FormData): Promise<ActionState> {
  const somaId = String(form.get("soma_id"));
  const meetingId = String(form.get("meeting_id"));
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);

  if (!files.length) return { message: "Selecione ao menos uma foto." };
  if (files.length > MAX_FILES) return { message: `Envie no máximo ${MAX_FILES} fotos por vez.` };
  for (const f of files) {
    if (!TYPES[f.type]) return { message: `"${f.name}" não é uma imagem JPG, PNG ou WebP.` };
    if (f.size > MAX_BYTES) return { message: `"${f.name}" passa de 5 MB.` };
  }
  if (form.get("consent") !== "on") {
    return { message: "Confirme que as pessoas nas fotos estão de acordo com a publicação." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: meeting } = await supabase.from("meetings").select("id, meeting_date").eq("id", meetingId).eq("soma_id", somaId).maybeSingle();
  if (!meeting) return { message: "Reunião não encontrada." };
  if (meeting.meeting_date > todayLocal()) return { message: "As fotos podem ser enviadas a partir do dia da reunião." };

  let sent = 0;
  const failed: string[] = [];
  for (const f of files) {
    const path = `${somaId}/${meetingId}/${crypto.randomUUID()}.${TYPES[f.type]}`;
    const up = await supabase.storage.from("meeting-photos").upload(path, f, { contentType: f.type, upsert: false });
    if (up.error) { failed.push(f.name); continue; }
    const ins = await supabase.from("meeting_photos").insert({
      meeting_id: meetingId, soma_id: somaId, storage_path: path, uploaded_by: user.id,
    });
    if (ins.error) {
      await supabase.storage.from("meeting-photos").remove([path]);
      failed.push(f.name);
      continue;
    }
    sent++;
  }

  revalidatePath(`/somas/${somaId}`, "layout");
  if (failed.length) {
    return { ok: sent > 0, message: `${sent} foto(s) enviada(s). Falhou: ${failed.join(", ")}. Tente enviar essas novamente.` };
  }
  return { ok: true, message: `${sent} foto(s) enviada(s) com sucesso.` };
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
