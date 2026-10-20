# Configuração privada do proprietário do painel

A área administrativa é liberada somente para a identidade autenticada cujo UUID do Supabase Auth corresponde ao segredo de servidor APP_OWNER_USER_ID. E-mail, perfil, armazenamento local e campos enviados pelo navegador não concedem papel administrativo.

## Configuração antes da implantação

1. Identifique o UUID do proprietário na tabela auth.users do projeto Supabase correto. Confirme que se trata da conta controlada pelo proprietário do aplicativo.
2. Configure APP_OWNER_USER_ID como segredo no ambiente de servidor do deployment. Não o grave no repositório, em variáveis VITE_, no navegador ou em mensagens.
3. Mantenha SUPABASE_SERVICE_ROLE_KEY somente no servidor. O bootstrap administrativo usa essa chave apenas dentro de um handler autenticado e verifica o UUID da sessão contra APP_OWNER_USER_ID antes de chamar configure_app_owner.
4. Publique a migration de controle de acesso. Quando o proprietário autenticado entrar, o servidor provisionará a configuração privada e o papel admin. Se o segredo estiver ausente ou inválido, todas as rotas e ações administrativas falham fechadas.
5. Para trocar o proprietário, configure primeiro o novo UUID no servidor e faça login com a nova conta. Não existe cadastro público de administradores e nenhum e-mail recebe admin automaticamente.

A conta configurada é sempre mantida ativa. Ela não aparece como alvo para bloqueio no painel. Outros usuários só entram após pré-liberação do e-mail ou liberação manual pelo proprietário após confirmação de compra na Kiwify.

## Sem configuração

Sem APP_OWNER_USER_ID válido, nenhuma identidade pode abrir /admin/acessos nem executar operações administrativas pelo servidor. Novas contas permanecem pendentes; contas existentes continuam ativas por compatibilidade com a migration. Configure o segredo antes de disponibilizar a liberação de novos clientes.
