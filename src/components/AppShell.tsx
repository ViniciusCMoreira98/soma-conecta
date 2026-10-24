import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth";
import ShellNav from "@/components/ShellNav";

/**
 * Estrutura comum das páginas autenticadas. Busca a contagem de notificações não lidas
 * em toda página, para o selo do menu aparecer em qualquer tela (e se atualizar ao vivo).
 */
export default async function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .is("read_at", null);

  return (
    <ShellNav userId={profile.id} isAdmin={profile.role === "ADMIN"} initialUnread={count ?? 0}>
      {children}
    </ShellNav>
  );
}
