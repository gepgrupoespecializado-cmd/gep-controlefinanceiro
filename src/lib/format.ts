export const brl = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export const dateBR = (iso?: string | Date | null) => {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
};

export const dateTimeBR = (iso?: string | Date | null) => {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

export const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36));

export const padNum = (n: number, len = 6) => String(n).padStart(len, "0");