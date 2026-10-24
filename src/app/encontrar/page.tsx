import Link from "next/link";
import { Clock, MapPin, Search, UserRound } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Alert, ConfirmForm, EmptyState, StatusBadge } from "@/components/ui";
import { requestJoin } from "@/app/actions/somas";
import { requireCompleteProfile } from "@/lib/auth";
import { WEEKDAY_LABEL, formatTime } from "@/lib/labels";
import { WEEKDAYS } from "@/lib/validation/schemas";

export const metadata = { title: "Encontrar um SOMA" };
const PAGE_SIZE = 12;

type SP = { q?: string; bairro?: string; dia?: string; periodo?: string; vagas?: string; pagina?: string; erro?: string; solicitado?: string };

// Escapa caracteres especiais do filtro ilike/or do PostgREST.
const clean = (s: string) => s.replace(/[%,()*\\]/g, " ").trim().slice(0, 80);

export default async function EncontrarPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase, profile, user } = await requireCompleteProfile();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.pagina) || 1);

  let query = supabase
    .from("somas_public")
    .select("id, name, description, neighborhood, weekday, start_time, cover_url, accepting_members, leader_name, member_count", { count: "exact" })
    .order("name");

  if (sp.q && clean(sp.q)) query = query.ilike("name", `%${clean(sp.q)}%`);
  if (sp.bairro && clean(sp.bairro)) query = query.ilike("neighborhood", `%${clean(sp.bairro)}%`);
  if (sp.dia && (WEEKDAYS as readonly string[]).includes(sp.dia)) query = query.eq("weekday", sp.dia);
  if (sp.vagas === "1") query = query.eq("accepting_members", true);
  if (sp.periodo === "MANHA") query = query.lt("start_time", "12:00");
  if (sp.periodo === "TARDE") query = query.gte("start_time", "12:00").lt("start_time", "18:00");
  if (sp.periodo === "NOITE") query = query.gte("start_time", "18:00");

  const from = (page - 1) * PAGE_SIZE;
  const { data: somas, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  const total = count ?? 0;

  // Situação do usuário em cada SOMA da página (para o botão "Solicitar entrada" no cartão).
  const ids = (somas ?? []).map((s) => s.id);
  const [{ data: mine }, { data: pendingReqs }] = ids.length
    ? await Promise.all([
        supabase.from("soma_members").select("soma_id").eq("user_id", user.id).eq("status", "ACTIVE").in("soma_id", ids),
        supabase.from("soma_join_requests").select("soma_id").eq("user_id", user.id).eq("status", "PENDING").in("soma_id", ids),
      ])
    : [{ data: [] as { soma_id: string }[] }, { data: [] as { soma_id: string }[] }];
  const memberOf = new Set((mine ?? []).map((m) => m.soma_id));
  const pendingIn = new Set((pendingReqs ?? []).map((r) => r.soma_id));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const FILTERS = ["q", "bairro", "dia", "periodo", "vagas"] as const;
  const qs = (p: number) => {
    const u = new URLSearchParams();
    FILTERS.forEach((k) => sp[k] && u.set(k, sp[k]!));
    u.set("pagina", String(p));
    return `/encontrar?${u}`;
  };

  return (
    <AppShell profile={profile}>
      <h1 className="text-2xl font-extrabold text-soma-900">Encontrar um SOMA</h1>
      <p className="mt-1 text-sm text-stone-600">Busque pelo seu bairro, dia e horário.</p>

      <form className="card mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" role="search">
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor="q" className="label">Nome</label>
          <input id="q" name="q" defaultValue={sp.q} className="input" placeholder="Nome do SOMA" />
        </div>
        <div>
          <label htmlFor="bairro" className="label">Bairro</label>
          <input id="bairro" name="bairro" defaultValue={sp.bairro} className="input" placeholder="Ex.: Centro" />
        </div>
        <div>
          <label htmlFor="dia" className="label">Dia</label>
          <select id="dia" name="dia" defaultValue={sp.dia ?? ""} className="input">
            <option value="">Todos</option>
            {WEEKDAYS.map((d) => <option key={d} value={d}>{WEEKDAY_LABEL[d]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="periodo" className="label">Período</label>
          <select id="periodo" name="periodo" defaultValue={sp.periodo ?? ""} className="input">
            <option value="">Qualquer</option>
            <option value="MANHA">Manhã</option>
            <option value="TARDE">Tarde</option>
            <option value="NOITE">Noite</option>
          </select>
        </div>
        <div className="flex items-end gap-3">
          <label className="flex min-h-[44px] items-center gap-2 text-sm">
            <input type="checkbox" name="vagas" value="1" defaultChecked={sp.vagas === "1"} className="h-5 w-5 accent-soma-600" />
            Aceitando membros
          </label>
        </div>
        <div className="sm:col-span-2 lg:col-span-5">
          <button className="btn-primary w-full sm:w-auto"><Search className="h-4 w-4" aria-hidden /> Buscar</button>
        </div>
      </form>

      <div className="mt-6 space-y-4" aria-live="polite">
        {sp.erro && <Alert tone="error">{sp.erro}</Alert>}
        {sp.solicitado && <Alert tone="success">Solicitação enviada! O responsável vai analisar e você será avisado.</Alert>}
        {error ? (
          <EmptyState title="Não foi possível carregar os SOMAS">Tente novamente em instantes.</EmptyState>
        ) : !somas?.length ? (
          <EmptyState title="Nenhum SOMA encontrado">
            Tente outro bairro ou limpe os filtros. Que tal{" "}
            <Link href="/cadastrar-soma" className="font-semibold text-soma-700 underline">cadastrar o seu</Link>?
          </EmptyState>
        ) : (
          <>
            <p className="mb-3 text-sm text-stone-600">{total} {total === 1 ? "SOMA encontrado" : "SOMAS encontrados"}</p>
            <ul className="grid gap-4 sm:grid-cols-2">
              {somas.map((s) => (
                <li key={s.id} className="card flex flex-col overflow-hidden">
                  {s.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.cover_url} alt="" loading="lazy" className="-mx-5 -mt-5 mb-4 aspect-[16/7] w-[calc(100%+2.5rem)] max-w-none object-cover" />
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-bold text-soma-900">{s.name}</h2>
                    {s.accepting_members && <StatusBadge text="Aceita membros" tone="green" />}
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-stone-600">
                    <li className="flex items-center gap-2"><MapPin className="h-4 w-4" aria-hidden /> {s.neighborhood}</li>
                    <li className="flex items-center gap-2"><Clock className="h-4 w-4" aria-hidden /> {WEEKDAY_LABEL[s.weekday]} às {formatTime(s.start_time)}</li>
                    <li className="flex items-center gap-2"><UserRound className="h-4 w-4" aria-hidden /> {s.leader_name}</li>
                  </ul>
                  <p className="mt-3 line-clamp-3 text-sm text-stone-700">{s.description}</p>
                  <div className="mt-auto flex flex-wrap gap-3 pt-4">
                    <Link href={`/somas/${s.id}`} className="btn-secondary flex-1">Ver detalhes</Link>
                    {memberOf.has(s.id) ? (
                      <span className="flex flex-1 items-center justify-center"><StatusBadge text="Você participa" tone="green" /></span>
                    ) : pendingIn.has(s.id) ? (
                      <span className="flex flex-1 items-center justify-center"><StatusBadge text="Solicitação enviada" tone="amber" /></span>
                    ) : s.accepting_members ? (
                      <div className="flex-1">
                        <ConfirmForm action={requestJoin}
                          message={`Solicitar entrada em "${s.name}"? O responsável verá seu nome, idade e celular para decidir.`}>
                          <input type="hidden" name="soma_id" value={s.id} />
                          <input type="hidden" name="back" value={qs(page)} />
                          <button className="btn-primary w-full">Solicitar entrada</button>
                        </ConfirmForm>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            {pages > 1 && (
              <nav aria-label="Paginação" className="mt-6 flex items-center justify-between">
                {page > 1 ? <Link href={qs(page - 1)} className="btn-secondary">Anterior</Link> : <span />}
                <span className="text-sm text-stone-600">Página {page} de {pages}</span>
                {page < pages ? <Link href={qs(page + 1)} className="btn-secondary">Próxima</Link> : <span />}
              </nav>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
