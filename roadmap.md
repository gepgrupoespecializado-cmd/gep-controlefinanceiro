# Roadmap

## Etapa 03 — normalização relacional
- [ ] Migração: customers, services, quotes, quote_items, appointments, financial_transactions, service_reports, report_photos, description_templates, organization_settings, audit_logs (+RLS/grants)
- [ ] Repositórios remotos por entidade (src/data/remote)
- [ ] Backfill idempotente do app_data.payload (UUID preservado / legacy_id)
- [ ] Sincronização Fase A (espelho: payload + tabelas)
- [ ] Fase B (leitura relacional) somente após validação
- [ ] Testes: isolamento A/B em todas as tabelas, idempotência, concorrência, typecheck/build

## Fora do escopo
Pagamentos, Kiwify/Stripe, planos, trial, painel Master, white-label, convites, offline sync.
