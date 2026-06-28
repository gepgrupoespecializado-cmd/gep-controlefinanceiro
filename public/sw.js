const CACHE_NAME = "gep-servicos-shell-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon-512.png"];

function offlineShell() {
  return new Response(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Controle de Prestação de Serviços GEP</title><style>body{font:15px/1.5 system-ui,-apple-system,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#fafafa;color:#111;padding:24px}.card{max-width:520px;width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;box-shadow:0 10px 30px #0001}h1{margin:0 0 8px;font-size:22px}p{margin:0 0 16px;color:#4b5563}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}a{display:block;text-align:center;text-decoration:none;color:#fff;background:#0b1b3d;border-radius:10px;padding:10px}</style></head><body><div class="card"><h1>Modo offline ativo</h1><p>Não foi possível atualizar a tela agora, mas você ainda pode acessar as áreas principais quando o cache local estiver disponível.</p><div class="grid"><a href="/">Home</a><a href="/clientes">Clientes</a><a href="/orcamentos">Orçamentos</a><a href="/financeiro">Financeiro</a></div></div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")).then((cached) => cached || offlineShell())),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => undefined);
          }
          return response;
        })
        .catch(() => cached);
    }),
  );
});