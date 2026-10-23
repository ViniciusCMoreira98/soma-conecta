import Link from "next/link";
import { Alert } from "@/components/ui";
import { GoogleButton, SignInForm } from "@/components/AuthForms";

export const metadata = { title: "Entrar" };

const ERROS: Record<string, string> = {
  "link-invalido": "O link expirou ou é inválido. Tente novamente.",
  "conta-suspensa": "Sua conta está suspensa. Fale com a liderança da igreja.",
  google: "Não foi possível entrar com o Google. Tente novamente.",
};

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const { next, erro } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-3xl font-extrabold text-soma-900">Entrar</h1>
      <p className="mt-1 text-stone-600">Bem-vindo de volta ao SOMA Conecta.</p>
      <div className="card mt-6 space-y-5">
        {erro && ERROS[erro] && <Alert tone="error">{ERROS[erro]}</Alert>}
        <GoogleButton next={next} />
        <div className="flex items-center gap-3 text-xs text-stone-500"><span className="h-px flex-1 bg-stone-200" />ou<span className="h-px flex-1 bg-stone-200" /></div>
        <SignInForm next={next} />
      </div>
      <p className="mt-6 text-center text-sm text-stone-600">
        Ainda não tem conta? <Link href="/cadastro" className="font-semibold text-soma-700 underline">Criar conta</Link>
      </p>
    </main>
  );
}
