import Link from "next/link";
import { ForgotPasswordForm } from "@/components/AuthForms";

export const metadata = { title: "Recuperar senha" };

export default function EsqueciSenhaPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-3xl font-extrabold text-soma-900">Recuperar senha</h1>
      <p className="mt-1 text-stone-600">Enviaremos um link para você criar uma nova senha.</p>
      <div className="card mt-6"><ForgotPasswordForm /></div>
      <p className="mt-6 text-center text-sm"><Link href="/entrar" className="font-semibold text-soma-700 underline">Voltar para entrar</Link></p>
    </main>
  );
}
