import AppShell from "@/components/AppShell";
import SomaTabs from "@/components/SomaTabs";
import ChatRoom, { type ChatMessage, type Sender } from "@/components/ChatRoom";
import { BellOff, BellRing } from "lucide-react";
import { setChatMuted } from "@/app/actions/community";
import { requireSomaMember } from "@/lib/soma-access";

export const metadata = { title: "Chat do SOMA" };
const PAGE = 40;

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile, user, isLeader, soma, chatMuted } = await requireSomaMember(id);

  const [{ data: latest }, { data: read }] = await Promise.all([
    supabase.from("messages").select("id, sender_id, content, created_at").eq("soma_id", id)
      .order("created_at", { ascending: false }).limit(PAGE),
    supabase.from("chat_reads").select("last_read_at").eq("soma_id", id).eq("user_id", user.id).maybeSingle(),
  ]);
  const messages = ((latest ?? []) as ChatMessage[]).reverse();

  const senderIds = [...new Set(messages.map((m) => m.sender_id))];
  const { data: profs } = senderIds.length
    ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", senderIds)
    : { data: [] as { id: string; full_name: string | null; avatar_url: string | null }[] };
  const senders: Record<string, Sender> = {};
  profs?.forEach((p) => (senders[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }));

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-extrabold text-soma-900">{soma.name}</h1>
      <SomaTabs somaId={id} active="chat" isLeader={isLeader} />
      <form action={setChatMuted} className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600">
        <input type="hidden" name="soma_id" value={id} />
        <input type="hidden" name="muted" value={chatMuted ? "0" : "1"} />
        <input type="hidden" name="back" value={`/somas/${id}/chat`} />
        <span className="flex items-center gap-2">
          {chatMuted ? <BellOff className="h-4 w-4" aria-hidden /> : <BellRing className="h-4 w-4 text-soma-600" aria-hidden />}
          {chatMuted ? "Notificações deste chat silenciadas." : "Você recebe avisos de novas mensagens."}
        </span>
        <button className="font-semibold text-soma-700 underline">{chatMuted ? "Voltar a avisar" : "Silenciar"}</button>
      </form>
      <div className="mt-2">
        <ChatRoom
          somaId={id} userId={user.id} initialMessages={messages} initialSenders={senders}
          hasMoreInitial={(latest?.length ?? 0) === PAGE} lastReadAt={read?.last_read_at ?? null}
        />
      </div>
    </AppShell>
  );
}
