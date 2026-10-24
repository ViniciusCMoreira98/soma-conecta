"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/validation/schemas";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function checkImage(file: FormDataEntryValue | null, maxMb: number): File | string {
  if (!(file instanceof File) || file.size === 0) return "Selecione uma imagem.";
  if (!TYPES[file.type]) return "Use uma imagem JPG, PNG ou WebP.";
  if (file.size > maxMb * 1024 * 1024) return `A imagem passa de ${maxMb} MB.`;
  return file;
}

/** Caminho dentro do bucket a partir da URL pública (para apagar a imagem anterior). */
function pathFromPublicUrl(url: string | null | undefined, bucket: string) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length).split("?")[0]) : null;
}

// ---------------------------------------------------------------- foto de perfil
export async function uploadAvatar(_: ActionState, form: FormData): Promise<ActionState> {
  const file = checkImage(form.get("avatar"), 2);
  if (typeof file === "string") return { message: file };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: prof } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).single();
  const path = `${user.id}/${crypto.randomUUID()}.${TYPES[file.type]}`;
  const up = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) return { message: "Não foi possível enviar a imagem. Tente novamente." };

  const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) {
    await supabase.storage.from("avatars").remove([path]);
    return { message: "Não foi possível salvar a foto de perfil." };
  }
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
export async function uploadCover(_: ActionState, form: FormData): Promise<ActionState> {
  const somaId = String(form.get("soma_id"));
  const file = checkImage(form.get("cover"), 5);
  if (typeof file === "string") return { message: file };

  const supabase = await createClient();
  const { data: soma } = await supabase.from("somas").select("cover_url").eq("id", somaId).maybeSingle();
  if (!soma) return { message: "SOMA não encontrado." };

  const path = `${somaId}/${crypto.randomUUID()}.${TYPES[file.type]}`;
  const up = await supabase.storage.from("soma-covers").upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) return { message: "Não foi possível enviar a capa. Verifique se você é o responsável deste SOMA." };

  const url = supabase.storage.from("soma-covers").getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from("somas").update({ cover_url: url }).eq("id", somaId);
  if (error) {
    await supabase.storage.from("soma-covers").remove([path]);
    return { message: "Não foi possível salvar a capa." };
  }
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
