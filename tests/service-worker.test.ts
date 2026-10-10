import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

function worker() {
  const handlers: Record<string, (event: any) => void> = {};
  const deleted: string[] = [];
  runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), {
    URL, Response,
    self: { location: { origin: "https://gep.example" },
      addEventListener: (name: string, handler: (event: any) => void) => { handlers[name] = handler; },
      clients: { claim: async () => {} }, skipWaiting: () => {} },
    caches: { keys: async () => ["gep-servicos-shell-v1", "gep-servicos-shell-v2", "unrelated"],
      delete: async (name: string) => { deleted.push(name); },
      match: async () => new Response("cached"), open: async () => ({ put: async () => {} }) },
    fetch: async () => new Response("network"),
  });
  return { handlers, deleted };
}

describe("cache do aplicativo instalado", () => {
  for (const url of ["https://backend.example/rest/v1/customers", "https://backend.example/rest/v1/quotes",
    "https://gep.example/api/private", "https://gep.example/_serverFn/save", "https://gep.example/dynamic.json"]) {
    test(`não intercepta dados: ${url}`, () => {
      const { handlers } = worker();
      let intercepted = false;
      handlers.fetch({ request: { url, method: "GET", mode: "cors", headers: new Headers() }, respondWith: () => { intercepted = true; } });
      expect(intercepted).toBe(false);
    });
  }
  test("não intercepta requisição autenticada mesmo em arquivo estático", () => {
    const { handlers } = worker();
    let intercepted = false;
    handlers.fetch({ request: new Request("https://gep.example/assets/data.js", { headers: { Authorization: "Bearer test" } }),
      respondWith: () => { intercepted = true; } });
    expect(intercepted).toBe(false);
  });
  test("mantém o cache de arquivos estáticos", () => {
    const { handlers } = worker();
    let intercepted = false;
    handlers.fetch({ request: new Request("https://gep.example/assets/app.js"), respondWith: () => { intercepted = true; } });
    expect(intercepted).toBe(true);
  });
  test("remove apenas caches antigos do aplicativo, não armazenamento local", async () => {
    const { handlers, deleted } = worker();
    let activation = Promise.resolve();
    handlers.activate({ waitUntil: (promise: Promise<void>) => { activation = promise; } });
    await activation;
    expect(deleted).toEqual(["gep-servicos-shell-v1"]);
  });
});