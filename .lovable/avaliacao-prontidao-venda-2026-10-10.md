# Avaliação de prontidão para assinatura multiempresa

Data: 10/10/2026. Escopo autorizado: validação e levantamento de pendências, sem implementação comercial ou alteração de dados de negócio.

## Parecer

Não liberar venda aberta por assinatura neste momento. A base funcional existe, mas persistência em produção, operação comercial e recuperação precisam de comprovação adicional.

## Evidências obtidas

- 32 testes passaram, com 74 verificações, cobrindo leitura relacional, recuperação de alterações, gravação concorrente, fases A/B/C e cache. Não há teste integrado do coordenador `cloud-sync.ts` nessa suíte.
- O endereço publicado respondeu HTTP 200; um arquivo JavaScript servido contém `gep_pending_changes:`. A tela de login publicada renderizou corretamente.
- No navegador local autenticado, Clientes e Orçamentos abriram com registros e sem exceções de página. Todas as gravações de dados foram bloqueadas pela instrumentação, inclusive 11 tentativas automáticas. Logo, essa navegação não comprova sucesso do salvamento nem pode servir como teste de falha de gravação concluído.
- As 17 tabelas públicas têm RLS habilitada. Todas as cinco empresas possuem o proprietário vinculado como owner. Consultas a seis tabelas filtradas por outra empresa retornaram listas vazias, sem erro.
- Limitação importante: as outras empresas consultadas não tinham clientes ou orçamentos. O retorno vazio, sozinho, não demonstra ocultação de registros existentes. As políticas consultadas exigem participação na empresa para as tabelas de negócio; falta teste com duas empresas de teste populadas e identidades diferentes.
- O bucket `empresa-arquivos` é privado e suas quatro políticas restringem operações à pasta da empresa atual. A listagem pelo navegador retornou erro, portanto o isolamento de arquivos não foi certificado por esse teste.
- A verificação básica de segurança atual não encontrou problemas; ela explicitamente não executa análise profunda de código. Não é uma certificação integral.
- Os registros capturados indicaram `build OK`. Não houve execução manual de build ou typecheck nesta avaliação, nem alteração de código do aplicativo.

## Pendências comprovadas ou riscos ainda não reproduzidos

| Prioridade | Pendência | Evidência e limite |
| --- | --- | --- |
| Bloqueio comercial | Cobrança e acesso por assinatura | O fluxo principal em `src/routes/__root.tsx:94-120` verifica sessão, empresa e migração, não assinatura ativa. Não foi localizado fluxo funcional de cobrança recorrente. |
| Bloqueio de confiabilidade | Salvamento publicado após sair e entrar | Não executado: exigiria gravações autorizadas em empresas de teste. Presença da correção no arquivo publicado não comprova todo o ciclo. |
| Risco a reproduzir | Troca de empresa durante gravação ou inicialização | `cloud-sync.ts:50-59, 199-208, 400-449` compartilha `pending`, fase e empresa atual, sem fila de inicialização. O fluxo normal de saída chama `stopOrgSync()` e aguarda flush; não foi demonstrada mistura de dados nesse fluxo. Os testes atuais não cobrem o coordenador completo. |
| Risco a reproduzir | Falha de leitura relacional na fase C | `cloud-sync.ts:425-466` pode recorrer ao bloco congelado e iniciar espelhamento. É necessário verificar se esse caminho poderia substituir dados mais recentes; não foi provocado contra dados reais. |
| Pendência de permissões | Escrita entre empresas e referências cruzadas | Não testada para preservar dados. As chaves estrangeiras consultadas ligam IDs, sem pares compostos por empresa; ainda deve ser avaliado se a aplicação e as políticas impedem referências indevidas. Isso não comprova exposição de dados. |
| Pendência de auditoria | Erros na gravação do histórico | `relational-sync.ts:135` não verifica o retorno falso de `aplicar` para `audit_logs`, diferentemente das tabelas de negócio. A política permite INSERT/SELECT, não UPDATE; o uso de upsert deve ser testado separadamente. Não alterado. |
| Pendência operacional | Backup e restauração | Cópias locais e bloco congelado não equivalem a backup completo com recuperação testada. Falta verificar a infraestrutura disponível e executar restauração em ambiente autorizado. |
| Pendência comercial | Condições e suporte | Preço, periodicidade, cancelamento, reembolso, inadimplência e atendimento ainda precisam de decisão do responsável. Os termos existentes usam texto genérico. |

## Próxima autorização necessária

Autorizar um teste completo de salvamento usando exclusivamente duas empresas de teste, com dados temporários identificáveis, sem utilizar dados de clientes reais. Esse teste precisa incluir criação, edição, saída, reentrada, falha de conexão e isolamento com registros existentes. Não criar essas empresas nem seus dados sem autorização própria.

Depois, apresentar escopo específico para corrigir apenas falhas reproduzidas e para implementar cobrança e acesso. Manter a intenção anterior de Kiwify até decisão explícita; não ativar outro serviço por conveniência.

A auditoria C1/C1-E/C1-F aguarda os respectivos diffs. C2 permanece separado e bloqueado. Nenhuma integração ou publicação foi realizada nesta avaliação.