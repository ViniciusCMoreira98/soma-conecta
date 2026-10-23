import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import SomaForm from "@/components/SomaForm";
import SomaTabs from "@/components/SomaTabs";
import { requireCompleteProfile } from "@/lib/auth";

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
      <div className="mt-5 max-w-2xl">
        <SomaForm mode="edit" somaId={id} leaderName={profile.full_name ?? ""} defaults={soma} />
      </div>
    </AppShell>
  );
}
