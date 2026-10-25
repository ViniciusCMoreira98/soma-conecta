import Link from "next/link";
import AppShell from "@/components/AppShell";
import { ProfileForm } from "@/components/AuthForms";
import { AvatarUploader } from "@/components/ImageUpload";
import DataRequestForm from "@/components/DataRequestForm";
import { InstallAppButton } from "@/components/InstallApp";
import { Avatar, ConfirmForm, StatusBadge } from "@/components/ui";
import { removeAvatar } from "@/app/actions/media";
import { requireCompleteProfile } from "@/lib/auth";
import { DATA_REQUEST_KIND_LABEL, DATA_REQUEST_STATUS_LABEL, formatDate } from "@/lib/labels";

export const metadata = { title: "Meu perfil" };

export default async function PerfilPage() {
  const { supabase, profile, user } = await requireCompleteProfile();

  const { data: requests } = await supabase.from("data_requests").select("id, kind, details, status, response, created_at, handled_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);

  return (
    <AppShell profile={profile}>
      <h1 className="text-2xl font-extrabold text-soma-900">Meu perfil</h1>
      <p className="mt-1 text-sm text-stone-600">{profile.email}</p>

      <div className="mt-5 grid max-w-3xl gap-5">
        <InstallAppButton className="w-full sm:w-auto sm:justify-self-start" />
        <section className="card space-y-4">
          <h2 className="font-bold text-stone-900">Foto de perfil</h2>
          <div className="flex items-center gap-4">
            <Avatar name={profile.full_name} url={profile.avatar_url} size={72} />
            <div className="text-sm text-stone-600">
              <p>Aparece para os membros dos seus SOMAS (chat e lista de membros).</p>
              {profile.avatar_url && (
                <ConfirmForm action={removeAvatar} message="Remover sua foto de perfil?">
                  <button className="mt-1 font-semibold text-red-700 underline">Remover foto</button>
                </ConfirmForm>
              )}
            </div>
          </div>
          <AvatarUploader userId={profile.id} />
        </section>

        <section className="card">
          <h2 className="mb-4 font-bold text-stone-900">Dados pessoais</h2>
          <ProfileForm
            defaults={{
              full_name: profile.full_name ?? "",
              age: profile.age?.toString() ?? "",
              phone: profile.phone ?? "",
              has_bases: profile.has_bases ? "SIM" : "NAO",
            }}
          />
        </section>

        <section className="card space-y-4">
          <div>
            <h2 className="font-bold text-stone-900">Seus dados (LGPD)</h2>
            <p className="mt-1 text-sm text-stone-600">
              Nome, idade, celular, bases e foto você corrige aqui mesmo, a qualquer momento. Para corrigir outro dado ou pedir a
              exclusão da conta, envie um pedido à administração. Veja a <Link href="/privacidade" className="underline">política de privacidade</Link>.
            </p>
          </div>
          {!!requests?.length && (
            <ul className="space-y-2">
              {requests.map((r) => (
                <li key={r.id} className="rounded-xl border border-stone-200 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{DATA_REQUEST_KIND_LABEL[r.kind]}</span>
                    <StatusBadge {...DATA_REQUEST_STATUS_LABEL[r.status]} />
                  </div>
                  <p className="mt-1 text-stone-600">{r.details}</p>
                  <p className="mt-1 text-xs text-stone-500">Enviado em {formatDate(r.created_at)}</p>
                  {r.response && <p className="mt-2 rounded-lg bg-soma-50 p-2 text-stone-700"><strong>Resposta: </strong>{r.response}</p>}
                </li>
              ))}
            </ul>
          )}
          <DataRequestForm />
        </section>
      </div>
    </AppShell>
  );
}
