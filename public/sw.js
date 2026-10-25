// Service worker do SOMA Conecta (PWA).
// Não guarda páginas em cache (o conteúdo depende do login e muda o tempo todo): apenas mostra uma
// tela amigável quando o aparelho está sem internet ao abrir/navegar no app.

const OFFLINE_HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem conexão · SOMA Conecta</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#faf9f6;
font-family:system-ui,sans-serif;color:#193d2c;text-align:center;padding:24px}button{margin-top:16px;min-height:44px;
padding:0 20px;border:0;border-radius:12px;background:#27704b;color:#fff;font-weight:700;font-size:16px}</style></head>
<body><div><h1>Sem conexão</h1><p>Verifique sua internet e tente novamente.</p>
<button onclick="location.reload()">Tentar de novo</button></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
    ),
  );
});
