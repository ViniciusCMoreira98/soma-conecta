import { NewPasswordForm } from "@/components/AuthForms";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Nova senha" };

export default async function NovaSenhaPage() {
  await requireUser();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-3xl font-extrabold text-soma-900">Criar nova senha</h1>
      <div className="card mt-6"><NewPasswordForm /></div>
    </main>
  );
}
