import { describe, it, expect } from "vitest";
import { ladoQuadrado, recorteCentral } from "../src/lib/foto-quadrada";

describe("foto quadrada do PDF", () => {
  it("limita a 1200 px pelo menor lado", () => { expect(ladoQuadrado(4000, 3000)).toBe(1200); });
  it("não amplia foto menor que 1200 px", () => { expect(ladoQuadrado(800, 600)).toBe(600); });
  it("recorta vertical no centro", () => { expect(recorteCentral(1000, 2000)).toEqual({ sx: 0, sy: 500, s: 1000 }); });
  it("recorta horizontal no centro", () => { expect(recorteCentral(3000, 1000)).toEqual({ sx: 1000, sy: 0, s: 1000 }); });
});
