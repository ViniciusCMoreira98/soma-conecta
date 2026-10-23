import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  age: number | null;
  has_bases: boolean | null;
  avatar_url: string | null;
  role: "MEMBER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
  profile_completed: boolean;
};

/** Usuário autenticado + perfil, ou null. */
export async function getSessionProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile) return null;
  return { supabase, user, profile };
}

/** Exige login. */
export async function requireUser() {
  const s = await getSessionProfile();
  if (!s) redirect("/entrar");
  if (s.profile.status === "SUSPENDED") redirect("/entrar?erro=conta-suspensa");
  return s;
}

/** Exige login + perfil completo (usado nas funcionalidades que dependem dos dados). */
export async function requireCompleteProfile() {
  const s = await requireUser();
  if (!s.profile.profile_completed) redirect("/perfil/completar");
  return s;
}

/** Exige administrador. A autorização real também é feita no banco (RLS/RPC). */
export async function requireAdmin() {
  const s = await requireCompleteProfile();
  if (s.profile.role !== "ADMIN") redirect("/encontrar");
  return s;
}
