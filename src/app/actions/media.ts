"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/validation/schemas";
import { isUploadedImagePath } from "@/lib/upload-path";


/** Caminho dentro do bucket a partir da URL pública (para apagar a imagem anterior). */
function pathFromPublicUrl(url: string | null | undefined, bucket: string) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length).split("?")[0]) : null;
}

// ---------------------------------------------------------------- foto de perfil
/** Grava a foto de perfil já enviada pelo navegador em avatars/{user_id}/... */
export async function saveAvatar(path: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  if (!isUploadedImagePath(path, user.id)) return { message: "Arquivo inválido." };

  const { data: prof } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).single();
  const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) return { message: "Não foi possível salvar a foto de perfil." };
  const old = pathFromPublicUrl(prof?.avatar_url, "avatars");
  if (old) await supabase.storage.from("avatars").remove([old]);

  revalidatePath("/", "layout");
  return { ok: true, message: "Foto de perfil atualizada." };
}

export async function removeAvatar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: prof } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).single();
  await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  const old = pathFromPublicUrl(prof?.avatar_url, "avatars");
  if (old) await supabase.storage.from("avatars").remove([old]);
  revalidatePath("/", "layout");
  redirect("/perfil");
}

// ---------------------------------------------------------------- capa do SOMA
/** Grava a capa já enviada pelo navegador em soma-covers/{soma_id}/... (só o responsável, garantido por RLS). */
export async function saveCover(somaId: string, path: string): Promise<ActionState> {
  if (!isUploadedImagePath(path, somaId)) return { message: "Arquivo inválido." };
  const supabase = await createClient();
  const { data: soma } = await supabase.from("somas").select("cover_url").eq("id", somaId).maybeSingle();
  if (!soma) return { message: "SOMA não encontrado." };

  const url = supabase.storage.from("soma-covers").getPublicUrl(path).data.publicUrl;
  const { data: updated, error } = await supabase.from("somas").update({ cover_url: url }).eq("id", somaId).select("id");
  if (error || !updated?.length) return { message: "Não foi possível salvar a capa." };
  const old = pathFromPublicUrl(soma.cover_url, "soma-covers");
  if (old) await supabase.storage.from("soma-covers").remove([old]);

  revalidatePath(`/somas/${somaId}`, "layout");
  revalidatePath("/encontrar");
  return { ok: true, message: "Imagem de capa atualizada." };
}

export async function removeCover(form: FormData) {
  const somaId = String(form.get("soma_id"));
  const supabase = await createClient();
  const { data: soma } = await supabase.from("somas").select("cover_url").eq("id", somaId).maybeSingle();
  await supabase.from("somas").update({ cover_url: null }).eq("id", somaId);
  const old = pathFromPublicUrl(soma?.cover_url, "soma-covers");
  if (old) await supabase.storage.from("soma-covers").remove([old]);
  revalidatePath(`/somas/${somaId}`, "layout");
  revalidatePath("/encontrar");
  redirect(`/somas/${somaId}/configuracoes`);
}
