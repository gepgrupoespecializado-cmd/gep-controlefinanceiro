import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const origin = "https://gep.example";
const swSource = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const pwaSource = stripTypeScriptTypes(
  readFileSync(new URL("../src/lib/pwa.ts", import.meta.url), "utf8"),
).replaceAll("export ", "");

function response(url, overrides = {}) {
  return {
    status: 200,
    type: "basic",
    redirected: false,
    url,
    headers: new Headers({
      "content-type": url.endsWith(".png") ? "image/png" : "application/json",
    }),
    clone() {
      return this;
    },
    ...overrides,
  };
}
function workerHarness({ offline = false, reply, brokenStorage = false } = {}) {
  const handlers = {};
  const stores = new Map();
  const calls = [];
  let claimed = false;
  const cache = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
      async match(key) {
        calls.push(["match", name, key]);
        return entries.get(key);
      },
      async put(key, value) {
        calls.push(["put", name, key]);
        entries.set(key, value);
      },
      async delete(key) {
        return entries.delete(key);
      },
    };
  };
  vm.runInNewContext(swSource, {
    URL,
    Headers,
    Response,
    Request,
    console,
    self: {
      location: { origin },
      addEventListener: (name, handler) => {
        handlers[name] = handler;
      },
      skipWaiting: async () => {},
      clients: {
        claim: async () => {
          claimed = true;
        },
      },
    },
    caches: {
      async keys() {
        if (brokenStorage) throw Error("storage unavailable");
        return [...stores.keys()];
      },
      async open(name) {
        if (brokenStorage) throw Error("storage unavailable");
        return cache(name);
      },
      async delete(name) {
        calls.push(["delete-cache", name]);
        return stores.delete(name);
      },
    },
    fetch: async (input, options) => {
      calls.push(["fetch", input, options]);
      if (offline) throw Error("offline");
      return reply ?? response(typeof input === "string" ? input : input.url);
    },
  });
  async function dispatch(type, data = {}) {
    const jobs = [];
    let result;
    handlers[type]({
      ...data,
      waitUntil: (p) => jobs.push(p),
      respondWith: (p) => {
        result = p;
      },
    });
    // Attach rejection handlers immediately, including rejected respondWith promises.
    const settled = await Promise.allSettled([result, ...jobs]);
    if (settled[0].status === "rejected") throw settled[0].reason;
    return settled[0].value;
  }
  return { calls, stores, dispatch, claimed: () => claimed };
}
function request(path, options = {}) {
  return {
    url: new URL(path, origin).href,
    method: "GET",
    mode: "cors",
    headers: new Headers(),
    ...options,
  };
}

for (const path of ["/manifest.webmanifest", "/icon-512.png"]) {
  test(`cache público sem credenciais: ${path}`, async () => {
    const h = workerHarness();
    await h.dispatch("fetch", { request: request(path) });
    await h.dispatch("fetch", { request: request(path) });
    assert.equal(h.calls.filter(([op]) => op === "put").length, 1);
    const fetches = h.calls.filter(([op]) => op === "fetch");
    assert.equal(fetches.length, 1);
    assert.equal(fetches[0][2].credentials, "omit");
    assert.equal(fetches[0][2].cache, "no-store");
    assert.equal(fetches[0][2].redirect, "error");
  });
}
for (const [name, req] of [
  ["Supabase", request("https://project.supabase.co/rest/v1/customers")],
  ["Auth", request("https://project.supabase.co/auth/v1/user")],
  ["API local", request("/api/data")],
  ["API futura", request("/new-endpoint")],
  ["CDN", request("https://cdn.example/icon-512.png")],
  ["foto privada", request("/uploads/tenant/photo.png")],
  ["query", request("/icon-512.png?tenant=1")],
  [
    "Authorization",
    request("/icon-512.png", { headers: new Headers({ Authorization: "Bearer synthetic" }) }),
  ],
  ["apikey", request("/manifest.webmanifest", { headers: new Headers({ apikey: "synthetic" }) })],
  ["Range", request("/icon-512.png", { headers: new Headers({ Range: "bytes=0-10" }) })],
  ["POST", request("/api/data", { method: "POST", body: "synthetic" })],
  ["HTML", request("/", { mode: "navigate" })],
]) {
  test(`não consulta nem grava cache para ${name}`, async () => {
    const h = workerHarness();
    await h.dispatch("fetch", { request: req });
    assert.equal(
      h.calls.some(([op]) => op === "match" || op === "put"),
      false,
    );
    const call = h.calls.find(([op]) => op === "fetch");
    assert.equal(call[1], req);
    assert.equal(call[2].cache, "no-store");
  });
}
for (const [name, overrides] of [
  ["HTML", { headers: new Headers({ "content-type": "text/html" }) }],
  [
    "private",
    { headers: new Headers({ "content-type": "image/png", "cache-control": "private" }) },
  ],
  [
    "no-store",
    { headers: new Headers({ "content-type": "image/png", "cache-control": "no-store" }) },
  ],
  ["Vary", { headers: new Headers({ "content-type": "image/png", vary: "Authorization" }) }],
  ["redirect", { redirected: true }],
  ["URL diferente", { url: `${origin}/api/private` }],
  ["opaca", { type: "opaque" }],
  ["erro", { status: 500 }],
  ["parcial", { status: 206 }],
]) {
  test(`resposta ${name} não entra no cache`, async () => {
    const h = workerHarness({ reply: response(`${origin}/icon-512.png`, overrides) });
    await h.dispatch("fetch", { request: request("/icon-512.png") });
    assert.equal(
      h.calls.some(([op]) => op === "put"),
      false,
    );
  });
}

test("ativação remove somente versões antigas GEP, inclusive gravação tardia", async () => {
  const h = workerHarness();
  for (const name of [
    "gep-servicos-shell-v1",
    "gep-static-v1",
    "gep-static-v2",
    "other-app",
    "gep-other",
    "gep-static-v2-backup",
  ])
    h.stores.set(name, new Map());
  await h.dispatch("install");
  await h.dispatch("activate");
  assert.equal(h.claimed(), true);
  assert.deepEqual(
    [...h.stores.keys()],
    ["gep-static-v2", "other-app", "gep-other", "gep-static-v2-backup"],
  );
  h.stores.set("gep-servicos-shell-v1", new Map());
  await h.dispatch("fetch", { request: request("/api/data") });
  assert.equal(h.stores.has("gep-servicos-shell-v1"), false);
});

test("troca A/B nunca usa resposta privada antiga para URL idêntica", async () => {
  const h = workerHarness();
  h.stores.set("gep-servicos-shell-v1", new Map([[`${origin}/api/data`, { secret: "A" }]]));
  for (const user of ["A", "B"])
    await h.dispatch("fetch", {
      request: request("/api/data", {
        headers: new Headers({ Authorization: `Bearer synthetic-${user}` }),
      }),
    });
  assert.equal(h.calls.filter(([op]) => op === "fetch").length, 2);
  assert.equal(
    h.calls.some(([op]) => op === "match" || op === "put"),
    false,
  );
});

for (const path of ["/", "/login", "/financeiro"])
  test(`offline neutro: ${path}`, async () => {
    const h = workerHarness({ offline: true });
    h.stores.set("gep-servicos-shell-v1", new Map([[`${origin}/`, { secret: "private" }]]));
    const res = await h.dispatch("fetch", { request: request(path, { mode: "navigate" }) });
    assert.equal(res.status, 503);
    const html = await res.text();
    assert.match(html, /Sem conexão/);
    assert.doesNotMatch(html, /localStorage|<script|<a |private|empresa|cliente/i);
  });

test("API offline falha sem HTML ou dados de reserva", async () => {
  const h = workerHarness({ offline: true });
  await assert.rejects(h.dispatch("fetch", { request: request("/api/data") }), /offline/);
});

test("falha de storage usa rede; handshake não confirma limpeza", async () => {
  const h = workerHarness({ brokenStorage: true });
  await h.dispatch("fetch", { request: request("/icon-512.png") });
  let reply;
  await h.dispatch("message", {
    data: { type: "GEP_PWA_POLICY" },
    ports: [
      {
        postMessage: (data) => {
          reply = data;
        },
      },
    ],
  });
  assert.equal(reply.policy, 2);
  assert.equal(reply.clean, false);
});

test("mensagem de logout confirma limpeza sem dados pessoais", async () => {
  const h = workerHarness();
  h.stores.set("gep-servicos-shell-v1", new Map());
  let reply;
  await h.dispatch("message", {
    data: { type: "GEP_PWA_CLEAN" },
    ports: [
      {
        postMessage: (data) => {
          reply = data;
        },
      },
    ],
  });
  assert.deepEqual(Object.keys(reply).sort(), ["clean", "policy"]);
  assert.equal(reply.clean, true);
  assert.equal(h.stores.size, 0);
});

function pwaHarness({ safe = true, clean = true, supported = true, changeOnUpdate = false } = {}) {
  const messages = [];
  const deleted = [];
  let registrations = 0;
  let options;
  let now = 0;
  const makeWorker = (policy) => ({
    postMessage(data, ports) {
      messages.push(data);
      queueMicrotask(() => ports[0].peer.onmessage?.({ data: { policy, clean } }));
    },
  });
  const serviceWorker = {
    controller: makeWorker(safe ? 2 : 1),
    async register(_url, opts) {
      registrations++;
      options = opts;
      return {
        async update() {
          if (changeOnUpdate) serviceWorker.controller = makeWorker(2);
        },
      };
    },
  };
  class Channel {
    constructor() {
      this.port1 = { close() {} };
      this.port2 = { close() {}, peer: this.port1 };
    }
  }
  const context = vm.createContext({
    window: { caches: true },
    navigator: supported ? { serviceWorker } : {},
    MessageChannel: Channel,
    console,
    Date: {
      now: () => {
        now += 1000;
        return now;
      },
    },
    setTimeout: (fn, ms) => setTimeout(fn, ms === 100 ? 0 : 100),
    clearTimeout,
    caches: {
      keys: async () => ["gep-servicos-shell-v1", "other-app", "gep-static-v2"],
      delete: async (name) => {
        deleted.push(name);
        return true;
      },
    },
  });
  vm.runInContext(
    `${pwaSource}\nglobalThis.api = { registerServiceWorker, ensureSafePwa, cleanPwaSession };`,
    context,
  );
  return {
    api: context.api,
    messages,
    deleted,
    options: () => options,
    registrations: () => registrations,
  };
}

test("registro imediato, idempotente e sem cache do script", async () => {
  const h = pwaHarness();
  await h.api.registerServiceWorker();
  await h.api.registerServiceWorker();
  assert.equal(h.registrations(), 1);
  assert.equal(h.options().updateViaCache, "none");
});
test("política segura permite carregamento e envia somente comando", async () => {
  const h = pwaHarness();
  await h.api.ensureSafePwa();
  assert.deepEqual(Object.keys(h.messages[0]), ["type"]);
  assert.equal(h.messages[0].type, "GEP_PWA_POLICY");
});
test("worker legado precisa ser substituído para liberar carregamento", async () => {
  const h = pwaHarness({ safe: false, changeOnUpdate: true });
  await h.api.ensureSafePwa();
  assert.equal(h.registrations(), 1);
});
test("worker legado persistente bloqueia carregamento", async () => {
  const h = pwaHarness({ safe: false });
  await assert.rejects(h.api.ensureSafePwa(), /Atualização de segurança pendente/);
});
test("limpeza não confirmada bloqueia carregamento", async () => {
  const h = pwaHarness({ clean: false });
  await assert.rejects(h.api.ensureSafePwa(), /Atualização de segurança pendente/);
});
test("logout com worker legado limpa apenas cache conhecido", async () => {
  const h = pwaHarness({ safe: false });
  await h.api.cleanPwaSession();
  assert.deepEqual(h.deleted, ["gep-servicos-shell-v1"]);
});
test("sem suporte ao SW não impede operação pela rede", async () => {
  const h = pwaHarness({ supported: false });
  await h.api.ensureSafePwa();
  assert.equal(h.registrations(), 0);
});
test("guard PWA precede consultas privadas na rota raiz", async () => {
  const { default: ts } = await import("typescript");
  const source = readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;

  function harness() {
    const events = [];
    let approve, rejectPolicy;
    const policy = new Promise((resolve, reject) => {
      approve = resolve;
      rejectPolicy = reject;
    });
    let policyCompleted = false;
    const sessionSignal = new AbortController().signal;
    const scope = { signal: sessionSignal, assertCurrent() {} };
    const privateCall = (name, result) => async () => {
      events.push(name);
      assert.equal(policyCompleted, true, `${name} iniciou antes da política PWA`);
      return result;
    };
    const cloud = {
      SessionChangedError: class SessionChangedError extends Error {},
      watchSessionIsolation() {},
      getIsolatedSession: privateCall("session", { ...scope, user: { id: "B" } }),
      loadOrgContext: privateCall("organization", { orgId: "org-B", scope }),
      initOrgSync: privateCall("sync", { status: "pronto" }),
    };
    const module = { exports: {} };
    const require = (name) => {
      if (name === "@tanstack/react-router")
        return {
          createRootRouteWithContext: () => (options) => options,
          redirect: (options) => Object.assign(new Error("redirect inesperado"), options),
        };
      if (name === "@/data/cloud-sync") return cloud;
      if (name === "@/lib/auth") return { isPublicRoute: () => false };
      if (name === "@/lib/pwa")
        return {
          ensureSafePwa: () => {
            events.push("pwa:start");
            return policy.then(() => {
              policyCompleted = true;
              events.push("pwa:complete");
            });
          },
        };
      // UI imports are inert: this test executes the real route guard, not rendering.
      return {};
    };
    const context = vm.createContext({ window: {}, AbortController });
    vm.runInContext(`(function(require,module,exports){${compiled}\n})`, context)(
      require,
      module,
      module.exports,
    );
    const controller = new AbortController();
    const run = () =>
      module.exports.Route.beforeLoad({
        location: { pathname: "/" },
        context: { queryClient: { cancelQueries: async () => {}, clear() {} } },
        abortController: controller,
      });
    return { events, approve, rejectPolicy, controller, run };
  }

  const allowed = harness();
  const loading = allowed.run();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(allowed.events, ["pwa:start"], "política pendente deve bloquear consultas");
  allowed.approve();
  await loading;
  assert.deepEqual(allowed.events, [
    "pwa:start",
    "pwa:complete",
    "session",
    "organization",
    "sync",
  ]);

  const denied = harness();
  const failure = new Error("política PWA não confirmada");
  const rejected = assert.rejects(denied.run(), (error) => error === failure);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(denied.events, ["pwa:start"]);
  denied.rejectPolicy(failure);
  await rejected;
  assert.deepEqual(
    denied.events,
    ["pwa:start"],
    "política rejeitada não pode iniciar dados privados",
  );

  const cancelled = harness();
  const obsolete = cancelled.run();
  cancelled.controller.abort();
  await obsolete;
  cancelled.approve();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(
    cancelled.events,
    ["pwa:start", "pwa:complete"],
    "aprovação tardia não reativa rota cancelada",
  );
});
