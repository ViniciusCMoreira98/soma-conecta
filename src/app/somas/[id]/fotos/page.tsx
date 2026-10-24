import Link from "next/link";
import AppShell from "@/components/AppShell";
import SomaTabs from "@/components/SomaTabs";
import PhotoGrid from "@/components/PhotoGrid";
import { EmptyState } from "@/components/ui";
import { requireSomaMember } from "@/lib/soma-access";
import { formatDate } from "@/lib/labels";

export default async function FotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile, isLeader, soma } = await requireSomaMember(id);

  const { data: meetings } = await supabase
    .from("meetings")
    .select("id, meeting_date, title, photos:meeting_photos(id, storage_path, caption)")
    .eq("soma_id", id).order("meeting_date", { ascending: false }).limit(60);

  const withPhotos = (meetings ?? []).filter((m) => (m.photos as unknown[]).length > 0);
  const paths = withPhotos.flatMap((m) => (m.photos as { storage_path: string }[]).map((p) => p.storage_path));
  const { data: signed } = paths.length
    ? await supabase.storage.from("meeting-photos").createSignedUrls(paths, 3600)
    : { data: [] as { path: string | null; signedUrl: string }[] };

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-extrabold text-soma-900">{soma.name}</h1>
      <SomaTabs somaId={id} active="fotos" isLeader={isLeader} />
      <div className="mt-5 space-y-8">
        {!withPhotos.length ? (
          <EmptyState title="Ainda não há fotos">
            {isLeader ? (
              <>Abra um encontro em <Link className="font-semibold text-soma-700 underline" href={`/somas/${id}/reunioes`}>Encontros</Link> para enviar fotos.</>
            ) : "As fotos aparecem aqui quando o responsável publicar."}
          </EmptyState>
        ) : (
          withPhotos.map((m) => {
            const grid = (m.photos as { id: string; storage_path: string; caption: string | null }[]).flatMap((p) => {
              const url = signed?.find((s) => s.path === p.storage_path)?.signedUrl;
              return url ? [{ id: p.id, url, caption: p.caption }] : [];
            });
            return (
              <section key={m.id}>
                <h2 className="mb-2 font-bold">
                  <Link href={`/somas/${id}/reunioes/${m.id}`} className="hover:underline">{m.title || "Encontro do SOMA"}</Link>
                  <span className="ml-2 text-sm font-normal text-stone-500">{formatDate(m.meeting_date + "T12:00:00")}</span>
                </h2>
                <PhotoGrid photos={grid} somaId={id} canDelete={isLeader} back={`/somas/${id}/fotos`} />
              </section>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
