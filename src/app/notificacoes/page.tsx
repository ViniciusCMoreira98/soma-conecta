import Link from "next/link";
import { revalidatePath } from "next/cache";
import AppShell from "@/components/AppShell";
import { EmptyState } from "@/components/ui";
import { requireCompleteProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Notificações" };

async function markAllRead() {
  "use server";
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  revalidatePath("/notificacoes");
}

export default async function NotificacoesPage() {
  const { supabase, profile } = await requireCompleteProfile();
  const { data: items } = await supabase.from("notifications")
    .select("id, title, body, link, created_at, read_at").order("created_at", { ascending: false }).limit(50);
  const unread = items?.filter((n) => !n.read_at).length ?? 0;

  return (
    <AppShell profile={profile} unread={unread}>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-soma-900">Notificações</h1>
        {unread > 0 && (
          <form action={markAllRead}><button className="btn-secondary">Marcar todas como lidas</button></form>
        )}
      </div>
      <div className="mt-5">
        {!items?.length ? (
          <EmptyState title="Você não tem notificações" />
        ) : (
          <ul className="space-y-3">
            {items.map((n) => {
              const inner = (
                <>
                  <p className={`font-semibold ${n.read_at ? "text-stone-700" : "text-soma-900"}`}>
                    {!n.read_at && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-soma-600" aria-label="Não lida" />}
                    {n.title}
                  </p>
                  {n.body && <p className="text-sm text-stone-600">{n.body}</p>}
                  <p className="mt-1 text-xs text-stone-500">
                    {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Campo_Grande" }).format(new Date(n.created_at))}
                  </p>
                </>
              );
              return (
                <li key={n.id} className="card py-3">
                  {n.link ? <Link href={n.link} className="block">{inner}</Link> : inner}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
