export const metadata = { title: "Privacidade" };

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10 text-stone-700">
      <h1 className="text-3xl font-extrabold text-soma-900">Política de privacidade</h1>
      <p className="mt-2 text-sm text-stone-500">Modelo inicial — revise com a liderança da igreja antes de publicar.</p>
      <h2 className="mt-6 font-bold">Quais dados coletamos e por quê</h2>
      <p className="mt-1">Nome, idade, celular e se você possui bases, para que o responsável do SOMA conheça e acolha quem solicita entrada. E-mail e foto de perfil servem para autenticação e identificação no grupo. O responsável também registra a presença nas reuniões, para acompanhar e cuidar dos membros; esse resumo não é mostrado aos demais.</p>
      <h2 className="mt-6 font-bold">Quem vê seus dados</h2>
      <p className="mt-1">Seus dados não aparecem na busca de SOMAS. O responsável de um SOMA vê o perfil de quem solicita entrada nele; membros do mesmo grupo veem nome e foto. Administradores da plataforma têm acesso para moderação.</p>
      <h2 className="mt-6 font-bold">Fotos das reuniões</h2>
      <p className="mt-1">As fotos das reuniões são privadas e visíveis apenas aos membros do SOMA. Quem aparecer em uma foto pode pedir sua remoção ao responsável do grupo ou denunciá-la. A foto de perfil e a imagem de capa do SOMA ficam em endereço público (não listado), pois aparecem na busca e no chat.</p>
      <h2 className="mt-6 font-bold">Denúncias e moderação</h2>
      <p className="mt-1">Membros podem denunciar mensagens e fotos. A denúncia é vista apenas pela administração, que pode remover o conteúdo. Quem publicou é avisado da remoção, mas não de quem denunciou.</p>
      <h2 className="mt-6 font-bold">Seus direitos</h2>
      <p className="mt-1">
        Conforme a LGPD, você pode corrigir nome, idade, celular, bases e foto diretamente em <strong>Perfil</strong>. Também pela página de
        perfil, em “Seus dados (LGPD)”, você pode pedir a correção de outros dados ou a exclusão da conta. A administração responde pelo
        próprio aplicativo. Na exclusão, seus dados pessoais são apagados e a conta é desativada; as mensagens já enviadas permanecem no
        chat do grupo identificadas como “Usuário removido”.
      </p>
    </main>
  );
}
