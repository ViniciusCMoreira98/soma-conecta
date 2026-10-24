import AppShell from "@/components/AppShell";
import SomaTabs from "@/components/SomaTabs";
import ChatRoom, { type ChatMessage, type Sender } from "@/components/ChatRoom";
import { requireSomaMember } from "@/lib/soma-access";

export const metadata = { title: "Chat do SOMA" };
const PAGE = 40;

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile, user, isLeader, soma } = await requireSomaMember(id);

  const [{ data: latest }, { data: read }] = await Promise.all([
    supabase.from("messages").select("id, sender_id, content, created_at").eq("soma_id", id)
      .order("created_at", { ascending: false }).limit(PAGE),
    supabase.from("chat_reads").select("last_read_at").eq("soma_id", id).eq("user_id", user.id).maybeSingle(),
  ]);
  const messages = ((latest ?? []) as ChatMessage[]).reverse();
  const senderIds = [...new Set(messages.map((m) => m.sender_id))];
  const [{ data: profs }] = await Promise.all([
    senderIds.length
      ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", senderIds)
      : { data: [] as { id: string; full_name: string | null; avatar_url: string | null }[] },
    // Zera o contador da aba antes de renderizar (o ChatRoom continua marcando ao chegar mensagem nova).
    supabase.rpc("mark_chat_read", { p_soma: id }),
  ]);
  const senders: Record<string, Sender> = {};
  profs?.forEach((p) => (senders[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }));

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-extrabold text-soma-900">{soma.name}</h1>
      <SomaTabs somaId={id} active="chat" isLeader={isLeader} />
      <div className="mt-4">
        <ChatRoom
          somaId={id} userId={user.id} isLeader={isLeader} initialMessages={messages} initialSenders={senders}
          hasMoreInitial={(latest?.length ?? 0) === PAGE} lastReadAt={read?.last_read_at ?? null}
        />
      </div>
    </AppShell>
  );
}
