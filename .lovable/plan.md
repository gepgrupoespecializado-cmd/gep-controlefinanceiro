# Prontidão para venda por assinatura multiempresa

## Parecer

**Ainda não recomendo abrir vendas por assinatura.** O aplicativo tem uma base de gestão e cadastro de empresas, mas isso não equivale a uma operação comercial validada.

## O que foi confirmado nesta avaliação

| Área | Situação observada |
| --- | --- |
| Cadastro e acesso | Existem telas e código para criar conta, entrar, recuperar senha e cadastrar empresa. As configurações hospedadas de autenticação não foram verificadas nesta avaliação. |
| Salvamento publicado | O endereço publicado respondeu HTTP 200 e um arquivo JavaScript servido contém o mecanismo de alterações pendentes. Portanto, não é correto repetir que essa correção continua ausente da publicação. A permanência dos dados após sair e voltar ainda precisa de validação na versão publicada. |
| Assinaturas | Não foi localizado um fluxo funcional de cobrança recorrente nos módulos examinados. O acesso principal verifica sessão e empresa, sem uma verificação de assinatura ativa nesse fluxo. |
| Segurança | As verificações recentes de banco e MCP não apresentaram achados. Outras verificações retornaram incompletas ou desatualizadas, o que não permite certificar a segurança integral. |
| Termos comerciais | Existem termos de uso e política de privacidade. A seção de assinatura usa condições genéricas, sem definir a oferta comercial final. |

## Sequência recomendada

1. **Validar a operação antes de vender:** confirmar, na versão publicada, criação e edição de clientes e orçamentos, saída e novo acesso, reabertura do aplicativo instalado e recuperação após falha de conexão. Usar empresas de teste e preservar os dados existentes.
2. **Concluir a avaliação de segurança:** verificar acesso entre duas empresas, permissões por usuário e arquivos privados; atualizar as verificações pendentes. A auditoria C1/C1-E/C1-F continua condicionada ao recebimento dos respectivos diffs, sem integrar alterações ou liberar C2.
3. **Definir a oferta comercial:** preço, periodicidade, meio de cobrança, cancelamento, reembolso, política de inadimplência e canal de suporte. Não inventar valores nem trocar a intenção anterior de usar Kiwify por outro serviço sem decisão do responsável.
4. **Planejar separadamente cobrança e acesso:** pagamento confirmado deve liberar a empresa correta; cancelamento, reembolso e inadimplência devem seguir a política definida, sem apagar registros de negócio. A proteção deve valer também para pedidos diretos ao servidor, não apenas para as telas.
5. **Preparar a operação:** confirmar backup recuperável, executar teste de restauração, definir atendimento e revisar os documentos comerciais e de privacidade com orientação jurídica adequada.
6. **Fazer um piloto controlado:** liberar para poucas empresas somente após os critérios anteriores, acompanhar falhas e expandir quando os fluxos completos estiverem comprovados.

## Critérios para liberar a venda

- Clientes e orçamentos permanecem após sair, entrar novamente e reabrir a versão publicada.
- Uma empresa não consegue ler nem alterar registros ou arquivos de outra.
- Pagamento, renovação, cancelamento e reembolso produzem o acesso esperado, inclusive quando notificações chegam repetidas ou fora de ordem.
- Suspender acesso não apaga os dados da empresa.
- Recuperação de conta e restauração de backup são testadas.
- Preços, condições, suporte e responsabilidades estão definidos e comunicados ao comprador.
- Não há achados críticos de segurança pendentes; limitações restantes estão documentadas.

## Limites e detalhes técnicos

Esta é uma avaliação inicial de prontidão, não uma certificação de segurança, capacidade ou conformidade jurídica. A sincronização e o armazenamento local não substituem um procedimento de backup com restauração comprovada.

Não é obrigatório criar vários planos, trial, painel Master ou white-label para começar. Uma única assinatura pode ser suficiente, desde que cobrança, acesso, segurança e suporte estejam resolvidos.

**A aprovação deste plano autoriza apenas aprofundar a validação e apresentar as pendências comprovadas.** Não autoriza implementar cobrança, alterar banco ou dados de negócio, integrar C1/C2 ou publicar. Qualquer implementação comercial deverá ter escopo e autorização próprios.

**Recomendação:** concluir primeiro a validação do salvamento e da segurança; depois preparar a assinatura e iniciar um piloto, antes de anunciar venda aberta.