"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ReportButton from "@/components/ReportButton";
import { DEFAULT_AVATAR, avatarFallback } from "@/components/ui";

export type ChatMessage = { id: string; sender_id: string; content: string; created_at: string };
export type Sender = { full_name: string | null; avatar_url: string | null };

const PAGE = 40;
const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Campo_Grande" });

export default function ChatRoom({
  somaId, userId, isLeader, initialMessages, initialSenders, hasMoreInitial, lastReadAt,
}: {
  somaId: string; userId: string; isLeader: boolean; initialMessages: ChatMessage[];
  initialSenders: Record<string, Sender>; hasMoreInitial: boolean; lastReadAt: string | null;
}) {
  const supabase = useRef(createClient()).current;
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [senders, setSenders] = useState(initialSenders);
  const [hasMore, setHasMore] = useState(hasMoreInitial);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const bottom = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const known = useRef(new Set(initialMessages.map((m) => m.id)));
  const firstUnread = useRef(
    lastReadAt ? initialMessages.find((m) => m.sender_id !== userId && m.created_at > lastReadAt)?.id ?? null : null,
  );

  const ensureSender = useCallback(async (id: string) => {
    setSenders((cur) => {
      if (cur[id]) return cur;
      supabase.from("profiles").select("full_name, avatar_url").eq("id", id).maybeSingle().then(({ data }) => {
        if (data) setSenders((c) => ({ ...c, [id]: data }));
      });
      return cur;
    });
  }, [supabase]);

  const markRead = useCallback(() => { supabase.rpc("mark_chat_read", { p_soma: somaId }); }, [supabase, somaId]);

  useEffect(() => {
    markRead();
    const channel = supabase
      .channel(`chat:${somaId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `soma_id=eq.${somaId}` }, (payload) => {
        const m = payload.new as ChatMessage;
        if (known.current.has(m.id)) return;
        known.current.add(m.id);
        setMessages((cur) => [...cur, m]);
        ensureSender(m.sender_id);
        if (document.visibilityState === "visible") markRead();
      })
      // Mensagens removidas pela moderação somem para todos (o DELETE só traz o id).
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id && known.current.has(id)) setMessages((cur) => cur.filter((m) => m.id !== id));
      })
      .subscribe((status) => setOnline(status === "SUBSCRIBED"));
    return () => { supabase.removeChannel(channel); };
  }, [supabase, somaId, ensureSender, markRead]);

  useEffect(() => {
    if (stick.current) bottom.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function loadOlder() {
    if (loadingOlder || !messages.length) return;
    setLoadingOlder(true);
    stick.current = false;
    const { data, error: err } = await supabase
      .from("messages").select("id, sender_id, content, created_at")
      .eq("soma_id", somaId).lt("created_at", messages[0].created_at)
      .order("created_at", { ascending: false }).limit(PAGE);
    setLoadingOlder(false);
    if (err || !data) { setError("Não foi possível carregar mensagens antigas."); return; }
    data.forEach((m) => known.current.add(m.id));
    setHasMore(data.length === PAGE);
    setMessages((cur) => [...data.reverse(), ...cur]);
    [...new Set(data.map((m) => m.sender_id))].forEach(ensureSender);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("messages").insert({ soma_id: somaId, sender_id: userId, content })
      .select("id, sender_id, content, created_at").single();
    setSending(false);
    if (err || !data) { setError("Não foi possível enviar. Sua mensagem foi mantida; tente novamente."); return; }
    setText("");
    stick.current = true;
    if (!known.current.has(data.id)) {
      known.current.add(data.id);
      setMessages((cur) => [...cur, data]);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Excluir esta mensagem para todos?")) return;
    setError(null);
    const { error: err, count } = await supabase.from("messages").delete({ count: "exact" }).eq("id", id);
    if (err || !count) { setError("Não foi possível excluir a mensagem."); return; }
    setMessages((cur) => cur.filter((m) => m.id !== id));
  }

  return (
    <div className="flex h-[calc(100dvh-15rem)] min-h-[360px] flex-col rounded-xl2 border border-stone-200 bg-white md:h-[calc(100dvh-14rem)]">
      {!online && <p role="status" className="bg-amber-50 px-4 py-2 text-xs text-amber-900">Reconectando ao chat…</p>}
      <div
        className="flex-1 space-y-3 overflow-y-auto p-4"
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        aria-live="polite"
        aria-label="Mensagens do chat"
      >
        {hasMore && (
          <button onClick={loadOlder} disabled={loadingOlder} className="btn-secondary mx-auto flex min-h-[40px] text-xs">
            {loadingOlder && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Carregar mensagens anteriores
          </button>
        )}
        {!messages.length && <p className="py-10 text-center text-sm text-stone-500">Nenhuma mensagem ainda. Diga olá ao seu grupo!</p>}
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          const s = senders[m.sender_id];
          return (
            <div key={m.id}>
              {firstUnread.current === m.id && (
                <div className="my-2 flex items-center gap-2 text-xs font-semibold text-soma-700">
                  <span className="h-px flex-1 bg-soma-300" /> Novas mensagens <span className="h-px flex-1 bg-soma-300" />
                </div>
              )}
              <div className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-soma-100 text-xs font-bold text-soma-800" aria-hidden>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s?.avatar_url || DEFAULT_AVATAR} alt="" className="h-full w-full object-cover" onError={avatarFallback} />

                </div>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? "bg-soma-600 text-white" : "bg-stone-100 text-stone-900"}`}>
                  {!mine && <p className="text-xs font-semibold text-soma-800">{s?.full_name ?? "Membro"}</p>}
                  <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
                  <p className={`mt-0.5 text-[10px] ${mine ? "text-soma-100" : "text-stone-500"}`}>{fmt.format(new Date(m.created_at))}</p>
                </div>
                {(mine || isLeader) && (
                  <button type="button" onClick={() => remove(m.id)} aria-label="Excluir mensagem" title="Excluir mensagem"
                    className="self-center rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-red-700">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                )}
                {!mine && (
                  <ReportButton targetType="MESSAGE" targetId={m.id} label=""
                    className="self-center rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-red-700" />
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {error && <p role="alert" className="px-4 pb-1 text-sm text-red-700">{error}</p>}
      <form onSubmit={send} className="flex items-end gap-2 border-t border-stone-200 p-3">
        <label htmlFor="msg" className="sr-only">Mensagem</label>
        <textarea
          id="msg" value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={2000}
          placeholder="Escreva uma mensagem…" className="input max-h-32 min-h-[44px] resize-none py-2.5"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
        />
        <button type="submit" disabled={sending || !text.trim()} className="btn-primary h-11 w-11 shrink-0 px-0" aria-label="Enviar mensagem">
          {sending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Send className="h-5 w-5" aria-hidden />}
        </button>
      </form>
    </div>
  );
}
