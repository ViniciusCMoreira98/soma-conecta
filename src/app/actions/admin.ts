"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, safePath, withParams } from "@/lib/db-errors";

const err = (back: string, msg: string) => redirect(withParams(back, { erro: msg }));
const ok = (back: string, msg = "1") => redirect(withParams(back, { ok: msg }));

/** Suspende ou reativa uma conta (com motivo obrigatório na suspensão). */
export async function setUserStatus(form: FormData) {
  const back = safePath(form.get("back"), "/admin/usuarios", "/admin/");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_status", {
    p_user: String(form.get("user_id")),
    p_suspend: form.get("suspend") === "1",
    p_reason: String(form.get("reason") ?? "") || null,
  });
  revalidatePath("/admin", "layout");
  if (error) err(back, dbMessage(error, "Não foi possível alterar a conta."));
  ok(back, form.get("suspend") === "1" ? "Conta suspensa." : "Conta reativada.");
}

/** Remove o conteúdo denunciado (mensagem ou foto) ou arquiva a denúncia. */
export async function resolveReport(form: FormData) {
  const back = "/admin/denuncias";
  const reportId = String(form.get("report_id"));
  const remove = form.get("decision") === "remove";
  const supabase = await createClient();

  if (remove) {
    const { data: rep } = await supabase.from("reports").select("target_type, target_id").eq("id", reportId).maybeSingle();
    if (rep?.target_type === "PHOTO") {
      const { data: photo } = await supabase.from("meeting_photos").select("storage_path").eq("id", rep.target_id).maybeSingle();
      if (photo) {
        const { error: stErr } = await supabase.storage.from("meeting-photos").remove([photo.storage_path]);
        if (stErr) err(back, "Não foi possível apagar o arquivo da foto. Tente novamente.");
      }
    }
  }

  const { error } = await supabase.rpc("admin_resolve_report", {
    p_report: reportId, p_remove: remove, p_note: String(form.get("note") ?? "") || null,
  });
  revalidatePath("/admin", "layout");
  if (error) err(back, dbMessage(error, "Não foi possível registrar a decisão."));
  ok(back, remove ? "Conteúdo removido e denúncia encerrada." : "Denúncia arquivada.");
}

/** Responde um pedido LGPD (atendido ou não), com mensagem ao titular. */
export async function decideDataRequest(form: FormData) {
  const back = "/admin/lgpd";
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_decide_data_request", {
    p_request: String(form.get("request_id")),
    p_done: form.get("decision") === "done",
    p_response: String(form.get("response") ?? ""),
  });
  revalidatePath("/admin", "layout");
  if (error) err(back, dbMessage(error, "Não foi possível responder o pedido."));
  ok(back, "Resposta enviada ao titular.");
}

/** Anonimiza a conta (exclusão de dados pessoais) e remove a foto de perfil do Storage. */
export async function anonymizeUser(form: FormData) {
  const userId = String(form.get("user_id"));
  const back = safePath(form.get("back"), `/admin/usuarios/${userId}`, "/admin/");
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_anonymize_user", { p_user: userId });
  if (error) err(back, dbMessage(error, "Não foi possível anonimizar a conta."));

  const { data: files } = await supabase.storage.from("avatars").list(userId);
  if (files?.length) await supabase.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`));

  revalidatePath("/admin", "layout");
  ok(back, "Dados pessoais removidos. Apague também o login em Supabase → Authentication → Users.");
}
