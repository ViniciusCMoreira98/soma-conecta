import Link from "next/link";
import AppShell from "@/components/AppShell";
import SomaTabs from "@/components/SomaTabs";
import { MeetingForm } from "@/components/MeetingForms";
import { requireSomaMember } from "@/lib/soma-access";

export default async function NovaReuniaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile, soma } = await requireSomaMember(id, { leaderOnly: true });
  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-extrabold text-soma-900">{soma.name}</h1>
      <SomaTabs somaId={id} active="reunioes" isLeader />
      <div className="mt-5 max-w-2xl space-y-4">
        <Link href={`/somas/${id}/reunioes`} className="text-sm font-medium text-soma-700 underline">← Reuniões</Link>
        <h2 className="text-xl font-bold">Nova reunião</h2>
        <p className="text-sm text-stone-600">Escolha uma data futura para agendar (os membros são avisados) ou uma data passada para registrar uma reunião que já aconteceu.</p>
        <MeetingForm somaId={id} />
      </div>
    </AppShell>
  );
}
