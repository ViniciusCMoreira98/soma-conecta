import Link from "next/link";
import { redirect } from "next/navigation";
import { HeartHandshake, MapPin, MessagesSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/encontrar");

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-soma-600">SOMA Conecta</p>
      <h1 className="mt-2 text-4xl font-extrabold leading-tight text-soma-900">
        Comunhão perto de você, organizada em um só lugar.
      </h1>
      <p className="mt-4 text-lg text-stone-600">
        Encontre um SOMA na sua região, acompanhe as reuniões e converse com o seu grupo.
      </p>

      <ul className="mt-8 space-y-3 text-stone-700">
        <li className="flex items-center gap-3"><MapPin className="h-5 w-5 text-soma-600" aria-hidden /> Busque por bairro, dia e horário</li>
        <li className="flex items-center gap-3"><HeartHandshake className="h-5 w-5 text-soma-600" aria-hidden /> Solicite entrada e acompanhe a resposta</li>
        <li className="flex items-center gap-3"><MessagesSquare className="h-5 w-5 text-soma-600" aria-hidden /> Reuniões, fotos e chat do seu grupo</li>
      </ul>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/cadastro" className="btn-primary">Criar conta</Link>
        <Link href="/entrar" className="btn-secondary">Entrar</Link>
      </div>
    </main>
  );
}
