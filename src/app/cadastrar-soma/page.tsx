import AppShell from "@/components/AppShell";
import SomaForm from "@/components/SomaForm";
import { requireCompleteProfile } from "@/lib/auth";

export const metadata = { title: "Cadastrar meu SOMA" };

export default async function CadastrarSomaPage() {
  const { profile } = await requireCompleteProfile();
  return (
    <AppShell profile={profile}>
      <h1 className="text-2xl font-extrabold text-soma-900">Cadastrar meu SOMA</h1>
      <p className="mb-6 mt-1 text-sm text-stone-600">
        Sua solicitação será analisada pela administração. O SOMA só aparece na busca depois de aprovado.
      </p>
      <div className="max-w-2xl">
        <SomaForm mode="create" leaderName={profile.full_name ?? ""} />
      </div>
    </AppShell>
  );
}
