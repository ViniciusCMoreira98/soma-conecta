import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/AuthForms";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Complete seu perfil" };

export default async function CompletarPerfilPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { profile } = await requireUser();
  const { next } = await searchParams;
  if (profile.profile_completed) redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/encontrar");

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="text-3xl font-extrabold text-soma-900">Complete seu perfil</h1>
      <p className="mt-2 text-stone-600">
        Pedimos só o essencial para o responsável do SOMA conhecer e acolher você. Seus dados não aparecem na busca pública.
      </p>
      <div className="card mt-6">
        <ProfileForm
          onboarding
          next={next}
          defaults={{
            full_name: profile.full_name ?? "",
            age: profile.age?.toString() ?? "",
            phone: profile.phone ?? "",
            has_bases: profile.has_bases === null ? "" : profile.has_bases ? "SIM" : "NAO",
          }}
        />
      </div>
    </main>
  );
}
