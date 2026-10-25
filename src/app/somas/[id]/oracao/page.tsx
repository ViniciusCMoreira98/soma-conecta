import { CheckCircle2, HandHeart } from "lucide-react";
import AppShell from "@/components/AppShell";
import SomaTabs from "@/components/SomaTabs";
import PrayerForm from "@/components/PrayerForm";
import { Alert, Avatar, ConfirmForm, EmptyState } from "@/components/ui";
import { deletePrayer, setPrayerAnswered, togglePraying } from "@/app/actions/prayers";
import { requireSomaMember } from "@/lib/soma-access";
import { formatDateTime } from "@/lib/labels";

export const metadata = { title: "Pedidos de oração" };

type Prayer = {
  id: string; content: string; is_anonymous: boolean; author_name: string | null; author_avatar: string | null;
  is_mine: boolean; answered_at: string | null; created_at: string; pray_count: number; i_pray: boolean;
};

export default async function OracaoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, profile, isLeader, soma } = await requireSomaMember(id);
  const { data } = await supabase.rpc("list_prayers", { p_soma: id });
  const prayers = (data ?? []) as Prayer[];

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-extrabold text-soma-900">{soma.name}</h1>
      <SomaTabs somaId={id} active="oracao" isLeader={isLeader} />
      <div className="mt-5 space-y-4">
        {sp.erro && <Alert tone="error">{sp.erro}</Alert>}
        <PrayerForm somaId={id} />
        {!prayers.length ? (
          <EmptyState title="Nenhum pedido de oração ainda">Compartilhe um pedido para que o grupo ore com você.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {prayers.map((p) => {
              const hidden = { soma_id: id, prayer_id: p.id };
              const name = p.is_anonymous && !p.is_mine ? "Pedido anônimo" : p.author_name ?? "Membro";
              return (
                <li key={p.id} className={`card ${p.answered_at ? "border-soma-200 bg-soma-50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <Avatar name={name} url={p.is_anonymous && !p.is_mine ? null : p.author_avatar} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-900">
                        {name}{p.is_mine && p.is_anonymous && <span className="font-normal text-stone-500"> (você, anônimo para os outros)</span>}
                      </p>
                      <p className="text-xs text-stone-500">{formatDateTime(p.created_at)}</p>
                    </div>
                    {p.answered_at && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-soma-700">
                        <CheckCircle2 className="h-4 w-4" aria-hidden /> Respondido
                      </span>
                    )}
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm text-stone-800">{p.content}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <form action={togglePraying}>
                      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
                      <button className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3 font-semibold ${
                        p.i_pray ? "border-soma-600 bg-soma-600 text-white" : "border-stone-300 text-stone-700 hover:border-soma-400"
                      }`}>
                        <HandHeart className="h-4 w-4" aria-hidden />
                        {p.i_pray ? "Orando" : "Estou orando"}
                      </button>
                    </form>
                    <span className="text-stone-500">
                      {p.pray_count === 0 ? "Seja o primeiro a orar" : `${p.pray_count} ${p.pray_count === 1 ? "pessoa orando" : "pessoas orando"}`}
                    </span>
                    <span className="flex-1" />
                    {p.is_mine && (
                      <form action={setPrayerAnswered}>
                        {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
                        <input type="hidden" name="answered" value={p.answered_at ? "0" : "1"} />
                        <button className="font-semibold text-soma-700 underline">{p.answered_at ? "Reabrir pedido" : "Marcar como respondido"}</button>
                      </form>
                    )}
                    {(p.is_mine || isLeader) && (
                      <ConfirmForm action={deletePrayer} message="Remover este pedido de oração?">
                        {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
                        <button className="font-semibold text-red-700 underline">Remover</button>
                      </ConfirmForm>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
