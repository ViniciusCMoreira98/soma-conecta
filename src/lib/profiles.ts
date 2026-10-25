import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type PrivateProfile = {
  id: string; full_name: string | null; email: string; phone: string | null; age: number | null;
  has_bases: boolean | null; avatar_url: string | null; status: string;
};

/**
 * Dados pessoais (celular, idade, e-mail, bases) dos perfis informados, lidos da visão profiles_private.
 * O banco só devolve quem o usuário atual pode ver (ele mesmo, admin, ou o responsável sobre seus membros
 * e pedidos de entrada pendentes); os demais simplesmente não aparecem no mapa.
 */
export async function privateProfiles(supabase: Client, ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  const map = new Map<string, PrivateProfile>();
  if (!unique.length) return map;
  const { data } = await supabase.from("profiles_private")
    .select("id, full_name, email, phone, age, has_bases, avatar_url, status").in("id", unique);
  (data as PrivateProfile[] | null)?.forEach((p) => map.set(p.id, p));
  return map;
}
