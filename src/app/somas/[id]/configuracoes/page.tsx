import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import SomaForm from "@/components/SomaForm";
import SomaTabs from "@/components/SomaTabs";
import { requireCompleteProfile } from "@/lib/auth";
import { CoverUploader } from "@/components/ImageUpload";
import { ConfirmForm } from "@/components/ui";
import { removeCover } from "@/app/actions/media";

export default async function ConfiguracoesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile, user } = await requireCompleteProfile();

  const { data: me } = await supabase.from("soma_members").select("role")
    .eq("soma_id", id).eq("user_id", user.id).eq("status", "ACTIVE").maybeSingle();
  if (me?.role !== "LEADER") redirect(`/somas/${id}`);

  const { data: soma } = await supabase.from("somas").select("*").eq("id", id).single();
  if (!soma) notFound();

  return (
    <AppShell profile={profile}>
      <Link href="/meus-somas" className="text-sm font-medium text-soma-700 underline">← Meus SOMAS</Link>
      <h1 className="mt-3 text-3xl font-extrabold text-soma-900">{soma.name}</h1>
      <SomaTabs somaId={id} active="configuracoes" isLeader />
      <div className="mt-5 max-w-2xl space-y-8">
        <section className="card space-y-4">
          <h2 className="text-lg font-bold text-soma-900">Imagem de capa</h2>
          {soma.cover_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={soma.cover_url} alt="Capa atual do SOMA" className="aspect-[16/7] w-full rounded-xl object-cover" />
              <ConfirmForm action={removeCover} message="Remover a imagem de capa?">
                <input type="hidden" name="soma_id" value={id} />
                <button className="text-sm font-semibold text-red-700 underline">Remover capa</button>
              </ConfirmForm>
            </>
          ) : (
            <p className="text-sm text-stone-600">Sem capa. Uma boa imagem ajuda as pessoas a reconhecerem o grupo na busca.</p>
          )}
          <CoverUploader somaId={id} />
        </section>
        <SomaForm mode="edit" somaId={id} leaderName={profile.full_name ?? ""} defaults={soma} />
      </div>
    </AppShell>
  );
}
