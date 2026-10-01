# Auditoria dos diffs C1, C1-E e C1-F

## Situação verificada

A auditoria consolidada ainda não pode ser concluída: neste checkout, as referências locais disponíveis são `main`, duas branches de edição e `origin/_agent-publish`; não há branch `codex-preparação` nem commits identificados como C1, C1-E e C1-F. O anexo anterior informa que C1-F não estava formalmente aprovada e que a validação em navegador real estava pendente; a indicação atual de que C1-F foi concluída precisa ser acompanhada de sua revisão identificável e do resultado dessa validação. Não atribuir mudanças do histórico atual a esses blocos por suposição.

## Próxima entrada necessária

Receber os identificadores imutáveis de base e conclusão de cada bloco (ou três arquivos de diff completos), além da confirmação de conclusão de C1-F e dos resultados de validação em navegador real. Se os blocos estiverem em outro repositório, solicitar os diffs exportados; uma branch mutável isolada não basta para fixar o escopo.

## Auditoria, sem integração

1. Comparar cada bloco com a mesma base publicada, identificar arquivos criados, alterados e removidos e produzir também o diff consolidado C1 + C1-E + C1-F.
2. Rastrear dependências e sobreposições entre os três blocos; verificar pacotes, banco e migrations, autenticação, RLS, isolamento entre empresas, sincronização A/B/C e preservação de `app_data`, dados locais e backups.
3. Inspecionar navegação, recuperação de erros, Service Worker/PWA e cache, além da compatibilidade com a versão publicada.
4. Simular a ordem de aplicação e reversão de cada separação possível. Recomendar pacote atômico de segurança C1 caso qualquer etapa isolada produza estado intermediário inseguro; admitir separação apenas com independência funcional, testes e rollback próprios demonstrados.
5. Entregar parecer com matriz de arquivos, dependências, riscos, decisão justificada, sequência proposta, testes de regressão e rollback. Se surgir schema ou migration, interromper e apresentar plano específico antes de qualquer aplicação.

## Portões de autorização

Esta auditoria não altera código, banco, dados, configuração ou publicação. A autorização `C1 APROVADA PARA INTEGRAÇÃO` libera somente a auditoria e o plano exato; executar exige segunda autorização explícita. Publicar exige autorização explícita posterior à validação da prévia. Preservar a revisão publicada atual e um ponto de restauração imutável. C2 permanece separado e bloqueado.
