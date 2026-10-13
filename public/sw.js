const POLICY_VERSION = 2;
const CACHE_NAME = "gep-static-v2";
const PUBLIC_FILES = new Map([
  ["/manifest.webmanifest", ["application/manifest+json", "application/json"]],
  ["/icon-512.png", ["image/png"]],
]);

function isOldGepCache(name) {
  return name !== CACHE_NAME && /^(gep-servicos-shell-v\d+|gep-static-v\d+)$/.test(name);
}

async function cleanLegacyCaches() {
  const names = await caches.keys();
  await Promise.all(names.filter(isOldGepCache).map((name) => caches.delete(name)));
}

function publicRequest(request) {
  const url = new URL(request.url);
  return (
    request.method === "GET" &&
    request.mode !== "navigate" &&
    url.origin === self.location.origin &&
    !url.search &&
    PUBLIC_FILES.has(url.pathname) &&
    !["authorization", "apikey", "range"].some((header) => request.headers.has(header))
  );
}

function publicResponse(response, url) {
  const type = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  return (
    response.status === 200 &&
    response.type === "basic" &&
    !response.redirected &&
    response.url === url.href &&
    PUBLIC_FILES.get(url.pathname).includes(type) &&
    !/\b(private|no-store|no-cache)\b/i.test(response.headers.get("cache-control") || "") &&
    !response.headers.has("vary") &&
    !response.headers.has("set-cookie")
  );
}

function offlineShell() {
  return new Response(
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem conexão</title></head><body><main><h1>Sem conexão</h1><p>Conecte-se à internet e tente novamente.</p></main></body></html>',
    {
      status: 503,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    },
  );
}

async function staticFile(request) {
  const url = new URL(request.url);
  let cache;
  try {
    cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url.href);
    if (hit && publicResponse(hit, url)) return hit;
    if (hit) await cache.delete(url.href);
  } catch {
    /* Storage unavailable: use the network only. */
  }
  // Never populate the public cache from a credentialed request.
  const response = await fetch(url.href, {
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
  });
  if (cache && publicResponse(response, url)) {
    try {
      await cache.put(url.href, response.clone());
    } catch {
      /* Network response remains usable. */
    }
  }
  return response;
}

self.addEventListener("install", (event) => {
  // Security update: replace the unsafe worker without forcing page reloads.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        await cleanLegacyCaches();
      } catch {
        /* Retried by the policy handshake. */
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (!["GEP_PWA_POLICY", "GEP_PWA_CLEAN"].includes(event.data?.type)) return;
  event.waitUntil(
    (async () => {
      try {
        await cleanLegacyCaches();
        event.ports[0]?.postMessage({ policy: POLICY_VERSION, clean: true });
      } catch {
        event.ports[0]?.postMessage({ policy: POLICY_VERSION, clean: false });
      }
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!/^https?:$/.test(new URL(request.url).protocol)) return;
  // Retry cleanup: an old worker may have completed an in-flight write.
  event.waitUntil(cleanLegacyCaches().catch(() => undefined));
  if (publicRequest(request)) {
    const response = staticFile(request);
    event.respondWith(response);
    event.waitUntil(
      response.then(
        () => undefined,
        () => undefined,
      ),
    );
    return;
  }
  // Auth, APIs, navigation and every non-allowlisted resource never touch cache.
  event.respondWith(
    fetch(request, { cache: "no-store" }).catch((error) => {
      if (request.mode === "navigate") return offlineShell();
      throw error;
    }),
  );
});
