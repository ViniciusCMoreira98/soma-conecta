export const metadata = { title: "Privacidade" };

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10 text-stone-700">
      <h1 className="text-3xl font-extrabold text-soma-900">Política de privacidade</h1>
      <p className="mt-2 text-sm text-stone-500">Modelo inicial — revise com a liderança da igreja antes de publicar.</p>
      <h2 className="mt-6 font-bold">Quais dados coletamos e por quê</h2>
      <p className="mt-1">Nome, idade, celular e se você possui bases, para que o responsável do SOMA conheça e acolha quem solicita entrada. E-mail e foto de perfil servem para autenticação e identificação no grupo.</p>
      <h2 className="mt-6 font-bold">Quem vê seus dados</h2>
      <p className="mt-1">Seus dados não aparecem na busca de SOMAS. O responsável de um SOMA vê o perfil de quem solicita entrada nele; membros do mesmo grupo veem nome e foto. Administradores da plataforma têm acesso para moderação.</p>
      <h2 className="mt-6 font-bold">Fotos das reuniões</h2>
      <p className="mt-1">As fotos são privadas e visíveis apenas aos membros do SOMA. Quem aparecer em uma foto pode pedir sua remoção ao responsável do grupo.</p>
      <h2 className="mt-6 font-bold">Seus direitos</h2>
      <p className="mt-1">Você pode corrigir seus dados no perfil e solicitar a exclusão da conta e das informações pessoais à liderança da igreja, conforme a LGPD.</p>
    </main>
  );
}
