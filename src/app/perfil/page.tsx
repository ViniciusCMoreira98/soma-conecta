import AppShell from "@/components/AppShell";
import { ProfileForm } from "@/components/AuthForms";
import { requireCompleteProfile } from "@/lib/auth";

export const metadata = { title: "Meu perfil" };

export default async function PerfilPage() {
  const { profile } = await requireCompleteProfile();
  return (
    <AppShell profile={profile}>
      <h1 className="text-2xl font-extrabold text-soma-900">Meu perfil</h1>
      <p className="mt-1 text-sm text-stone-600">{profile.email}</p>
      <div className="card mt-5 max-w-lg">
        <ProfileForm
          defaults={{
            full_name: profile.full_name ?? "",
            age: profile.age?.toString() ?? "",
            phone: profile.phone ?? "",
            has_bases: profile.has_bases ? "SIM" : "NAO",
          }}
        />
      </div>
      <section className="card mt-5 max-w-lg text-sm text-stone-600">
        <h2 className="font-semibold text-stone-800">Seus dados (LGPD)</h2>
        <p className="mt-1">
          Você pode corrigir seus dados acima a qualquer momento. Para solicitar a exclusão da conta e dos dados
          pessoais, fale com a liderança da igreja ou com o administrador da plataforma.
        </p>
      </section>
    </AppShell>
  );
}
