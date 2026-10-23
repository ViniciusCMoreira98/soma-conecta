import Link from "next/link";
import { GoogleButton, SignUpForm } from "@/components/AuthForms";

export const metadata = { title: "Criar conta" };

export default function CadastroPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-3xl font-extrabold text-soma-900">Criar conta</h1>
      <p className="mt-1 text-stone-600">Leva menos de um minuto.</p>
      <div className="card mt-6 space-y-5">
        <GoogleButton />
        <div className="flex items-center gap-3 text-xs text-stone-500"><span className="h-px flex-1 bg-stone-200" />ou<span className="h-px flex-1 bg-stone-200" /></div>
        <SignUpForm />
      </div>
      <p className="mt-6 text-center text-sm text-stone-600">
        Já tem conta? <Link href="/entrar" className="font-semibold text-soma-700 underline">Entrar</Link>
      </p>
    </main>
  );
}
