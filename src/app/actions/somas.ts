"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, safePath, withParams } from "@/lib/db-errors";
import { rejectionSchema, somaSchema, zodErrors, type ActionState } from "@/lib/validation/schemas";

export async function requestSomaRegistration(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = somaSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_soma_registration", {
    p_name: v.name,
    p_description: v.description,
    p_neighborhood: v.neighborhood,
    p_location_hint: v.location_hint || null,
    p_weekday: v.weekday,
    p_start_time: v.start_time,
    p_end_time: v.end_time || null,
    p_frequency: v.frequency,
    p_cover_url: null,
    p_extra_info: v.extra_info || null,
  });
  if (error) return { message: dbMessage(error, "Não foi possível enviar a solicitação. Tente novamente.") };

  revalidatePath("/meus-somas");
  redirect("/meus-somas?enviado=1");
}

export async function decideRegistration(form: FormData) {
  const id = String(form.get("request_id"));
  const approve = form.get("decision") === "approve";
  let reason: string | null = null;
  if (!approve) {
    const parsed = rejectionSchema.safeParse({ reason: form.get("reason") });
    if (!parsed.success) redirect(`/admin/solicitacoes?erro=${encodeURIComponent(parsed.error.issues[0].message)}`);
    reason = parsed.data.reason;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_soma_registration", {
    p_request: id, p_approve: approve, p_reason: reason,
  });
  if (error) redirect(`/admin/solicitacoes?erro=${encodeURIComponent(dbMessage(error, "Não foi possível registrar a decisão."))}`);
  revalidatePath("/admin", "layout");
  redirect("/admin/solicitacoes?ok=1");
}

export async function toggleSuspend(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_soma_suspended", {
    p_soma: String(form.get("soma_id")),
    p_suspend: form.get("suspend") === "1",
  });
  if (error) redirect(`/admin/somas?erro=${encodeURIComponent(dbMessage(error, "Ação não realizada."))}`);
  revalidatePath("/admin", "layout");
  redirect("/admin/somas?ok=1");
}

export async function requestJoin(form: FormData) {
  const somaId = String(form.get("soma_id"));
  // Pedido feito direto do cartão da busca volta para a mesma busca (com os filtros).
  const back = safePath(form.get("back"), `/somas/${somaId}`, "/encontrar");
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_join_soma", { p_soma: somaId });
  revalidatePath("/encontrar");
  revalidatePath("/meus-somas");
  if (error) redirect(withParams(back, { erro: dbMessage(error, "Não foi possível enviar a solicitação.") }));
  redirect(withParams(back, { solicitado: "1" }));
}

export async function cancelJoin(form: FormData) {
  const supabase = await createClient();
  await supabase.rpc("cancel_join_request", { p_request: String(form.get("request_id")) });
  revalidatePath("/meus-somas");
  redirect("/meus-somas");
}

export async function decideJoin(form: FormData) {
  const somaId = String(form.get("soma_id"));
  const approve = form.get("decision") === "approve";
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_join_request", {
    p_request: String(form.get("request_id")),
    p_approve: approve,
    p_reason: String(form.get("reason") ?? "") || null,
  });
  revalidatePath(`/somas/${somaId}`, "layout");
  if (error) redirect(`/somas/${somaId}/solicitacoes?erro=${encodeURIComponent(dbMessage(error, "Não foi possível registrar a decisão."))}`);
  redirect(`/somas/${somaId}/solicitacoes?ok=1`);
}

export async function removeMember(form: FormData) {
  const somaId = String(form.get("soma_id"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", { p_soma: somaId, p_user: String(form.get("user_id")) });
  revalidatePath(`/somas/${somaId}`, "layout");
  if (error) redirect(`/somas/${somaId}/membros?erro=${encodeURIComponent(dbMessage(error, "Não foi possível remover."))}`);
  redirect(`/somas/${somaId}/membros?ok=1`);
}

export async function leaveSoma(form: FormData) {
  const somaId = String(form.get("soma_id"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { error } = await supabase.rpc("remove_member", { p_soma: somaId, p_user: user.id });
  if (error) redirect(`/somas/${somaId}?erro=${encodeURIComponent(dbMessage(error, "Não foi possível sair."))}`);
  revalidatePath("/meus-somas");
  redirect("/meus-somas");
}

export async function updateSomaSettings(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = somaSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const v = parsed.data;
  const somaId = String(form.get("soma_id"));

  const supabase = await createClient();
  // RLS + trigger garantem que só o responsável edita e que status/líder não mudam.
  const { error } = await supabase
    .from("somas")
    .update({
      name: v.name, description: v.description, neighborhood: v.neighborhood,
      location_hint: v.location_hint || null, weekday: v.weekday, start_time: v.start_time,
      end_time: v.end_time || null, frequency: v.frequency, extra_info: v.extra_info || null,
      accepting_members: form.get("accepting_members") === "on",
    })
    .eq("id", somaId);
  if (error) return { message: "Não foi possível salvar. Verifique se você é o responsável deste SOMA." };
  revalidatePath(`/somas/${somaId}`, "layout");
  return { ok: true, message: "Informações atualizadas." };
}
