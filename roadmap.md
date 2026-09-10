# Roadmap

## Etapa 03 — normalização relacional
- [x] Migração: customers, services, quotes, quote_items, appointments, financial_transactions, service_reports, report_photos, description_templates, organization_settings, audit_logs (+RLS/grants)
- [x] Mapeadores e sincronizador relacional (src/data/remote)
- [x] Backfill idempotente do app_data.payload (UUID preservado / legacy_id)
- [x] Fase A ativa (espelho: payload + tabelas)
- [ ] Fase B (leitura relacional) — próxima etapa, após período de observação
- [x] Testes: isolamento A/B em todas as tabelas, idempotência, concorrência, typecheck/build

## Fora do escopo
Pagamentos, Kiwify/Stripe, planos, trial, painel Master, white-label, convites, offline sync.
