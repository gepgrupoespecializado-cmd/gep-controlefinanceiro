import { useDB } from "@/lib/store";

export function useCompanyName(): string {
  return useDB().empresa.nome?.trim() || "Sua empresa";
}