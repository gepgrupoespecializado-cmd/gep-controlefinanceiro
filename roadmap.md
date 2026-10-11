# Roadmap

## Correção pontual do relatório e numeração
- [x] Corrigir apenas proporção, alinhamento e paginação das fotos no relatório, preservando o restante do modelo.
- [x] Preservar número confirmado na recuperação local e acrescentar unicidade por empresa; concorrência, edição, reconexão e históricos validados em PostgreSQL descartável, sem gravações reais.
- [x] Validar PDFs com 0, 1, 3 e 15 fotos e descrição longa: 15 páginas inspecionadas, fotos sem cortes e pagamento sem sobreposição; 44 testes comuns e 1 integração aprovados.

## Numeração e fotos
- [x] Atribuir números na inserção, preservar os oito números existentes e validar repetição/concorrência com testes isolados, sem gravar dados reais.
- [x] Comprimir novas fotos e conferir miniaturas e PDF no navegador: 870 × 1305 px, 280.241 bytes, qualidade 0,7; fotos salvas preservadas.

## Prontidão para venda por assinatura
- [x] Avaliar cobrança, acesso e condições comerciais existentes, sem implementar funcionalidades.
- [x] Executar os 32 testes existentes e conferir telas e versão publicada sem gravar dados de negócio.
- [x] Consultar RLS, políticas de arquivos e verificação básica de segurança; documentar limites em `.lovable/avaliacao-prontidao-venda-2026-10-10.md`.
- [ ] Validar salvamento publicado e isolamento com duas empresas de teste populadas: aguarda autorização para criar e editar dados exclusivamente de teste.
- [ ] Concluir auditoria C1/C1-E/C1-F: aguarda os três diffs externos; C2 permanece bloqueado.
- [ ] Definir preço, periodicidade, cancelamento, reembolso, inadimplência e suporte: aguarda decisões do responsável.
- [ ] Implementar cobrança e acesso e testar restauração de backup: aguarda escopo e autorização específicos, fora da validação aprovada.

## Correção do salvamento
- [x] Investigar a nova ocorrência: envio real confirmado; reproduzido cache antigo de dados no Service Worker, corrigido e validado no navegador e em 32 testes.
- [x] Reproduzir e corrigir perda de alterações em gravações concorrentes e saída/reentrada.
- [x] Validar clientes e orçamentos, falha de rede e isolamento por empresa sem alterar dados existentes.

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

## Nome da empresa dinâmico
- [x] Remover marca fixa dos textos, títulos, PDFs e cadastro, sem alterar dados existentes.
- [x] Validar cadastro, edição, recarregamento e PDFs com Empresa Teste em sessão isolada com respostas simuladas; 33 testes aprovados, sem publicar ou gravar dados reais.
