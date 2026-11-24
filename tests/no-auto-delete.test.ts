import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

test("sincronização só apaga no servidor o que estava na Lixeira", () => {
  const src = readFileSync("src/data/remote/relational-sync.ts", "utf8");
  expect(src).toContain('["arquivado"] === true) removidos.push(id)');
  expect(src).not.toContain("if (!atual.has(id)) removidos.push(id)");
});
