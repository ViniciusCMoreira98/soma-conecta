"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Contador de não lidos de uma aba do SOMA, atualizado em tempo real a cada novo registro de outra pessoa. */
export default function UnreadBadge({
  somaId, userId, table, authorField, initial,
}: { somaId: string; userId: string; table: "messages" | "soma_announcements"; authorField: string; initial: number }) {
  const supabase = useRef(createClient()).current;
  const [count, setCount] = useState(initial);

  useEffect(() => setCount(initial), [initial]);

  useEffect(() => {
    const channel = supabase
      .channel(`unread:${table}:${somaId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table, filter: `soma_id=eq.${somaId}` }, (payload) => {
        if ((payload.new as Record<string, unknown>)[authorField] !== userId) setCount((c) => c + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, somaId, userId, table, authorField]);

  if (count <= 0) return null;
  return (
    <span className="ml-1.5 rounded-full bg-red-600 px-1.5 text-xs font-bold leading-5 text-white" aria-label={`${count} não lidos`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
