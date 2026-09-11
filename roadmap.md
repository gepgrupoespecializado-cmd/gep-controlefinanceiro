# Roadmap

## Etapa 03 — normalização relacional
- [x] Migração: customers, services, quotes, quote_items, appointments, financial_transactions, service_reports, report_photos, description_templates, organization_settings, audit_logs (+RLS/grants)
- [x] Mapeadores e sincronizador relacional (src/data/remote)
- [x] Backfill idempotente do app_data.payload (UUID preservado / legacy_id)
- [x] Fase A ativa (espelho: payload + tabelas)
- [x] Fase B (leitura relacional) implementada; empresas ainda em A até sessão real espelhar/conferir
- [x] Fase C preparada: fase lida do banco, promoção conservadora B->C, rollback C->B com reenvio do bloco JSON. Nenhuma empresa promovida.
- [x] Testes: isolamento A/B em todas as tabelas, idempotência, concorrência, typecheck/build

## Fora do escopo
Pagamentos, Kiwify/Stripe, planos, trial, painel Master, white-label, convites, offline sync.
