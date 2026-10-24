"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  profileSchema, signInSchema, signUpSchema, zodErrors, type ActionState,
} from "@/lib/validation/schemas";

/**
 * URL de retorno dos fluxos de autenticação. Usa o endereço pelo qual o usuário acessou
 * (funciona em localhost, na Vercel e nas prévias de deploy); NEXT_PUBLIC_SITE_URL só como alternativa.
 */
async function siteUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Aceita apenas caminhos internos para evitar redirecionamento aberto. */
function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/encontrar";
}

export async function signInWithPassword(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const msg = error.message.includes("Email not confirmed")
      ? "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada."
      : "E-mail ou senha incorretos.";
    return { message: msg };
  }
  redirect(safeNext(form.get("next")));
}

export async function signUpWithPassword(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${await siteUrl()}/auth/callback` },
  });
  if (error) {
    return { message: error.message.includes("registered") ? "Este e-mail já está cadastrado." : "Não foi possível criar a conta. Tente novamente." };
  }
  // Com verificação de e-mail ativa, não há sessão até confirmar.
  if (!data.session) {
    return { ok: true, message: "Enviamos um link de confirmação para o seu e-mail. Abra-o para ativar sua conta." };
  }
  redirect("/perfil/completar");
}

export async function signInWithGoogle(form: FormData) {
  const supabase = await createClient();
  const next = safeNext(form.get("next"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/entrar?erro=google");
  redirect(data.url);
}

export async function requestPasswordReset(_: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { errors: { email: "E-mail inválido." } };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/perfil/nova-senha`,
  });
  // Resposta neutra: não revela se o e-mail existe.
  return { ok: true, message: "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha." };
}

export async function updatePassword(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = signUpSchema.shape.password.safeParse(form.get("password"));
  if (!parsed.success) return { errors: { password: parsed.error.issues[0].message } };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { message: "Não foi possível atualizar a senha. Abra o link do e-mail novamente." };
  redirect("/encontrar");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function saveProfile(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      age: parsed.data.age,
      phone: parsed.data.phone,
      has_bases: parsed.data.has_bases === "SIM",
    })
    .eq("id", user.id);
  if (error) return { message: "Não foi possível salvar seus dados. Tente novamente." };

  if (form.get("onboarding") === "1") redirect(safeNext(form.get("next")));
  return { ok: true, message: "Dados atualizados com sucesso." };
}
