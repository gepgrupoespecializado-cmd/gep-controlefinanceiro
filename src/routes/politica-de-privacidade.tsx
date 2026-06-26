import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Controle de Prestação de Serviços GEP" },
      { name: "description", content: "Como o Controle de Prestação de Serviços GEP coleta, usa e protege seus dados." },
      { property: "og:title", content: "Política de Privacidade — Controle de Prestação de Serviços GEP" },
      { property: "og:description", content: "Como o Controle de Prestação de Serviços GEP coleta, usa e protege seus dados." },
      { name: "twitter:title", content: "Política de Privacidade — Controle de Prestação de Serviços GEP" },
      { name: "twitter:description", content: "Como o Controle de Prestação de Serviços GEP coleta, usa e protege seus dados." },
    ],
  }),
  component: PoliticaDePrivacidade,
});

function PoliticaDePrivacidade() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-[var(--primary-glow)] text-primary-foreground">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground">Última atualização: 26 de junho de 2026</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Esta página é mantida pelo responsável pelo aplicativo <strong>Controle de Prestação de Serviços GEP</strong> para
        explicar como dados pessoais são tratados na plataforma. As práticas descritas aqui aplicam-se ao uso do
        aplicativo e às informações processadas por seus usuários administradores e colaboradores.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Responsável pelo Tratamento</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          <p>
            O Responsável pelo Tratamento dos dados é o administrador da instância do aplicativo, identificado na página
            da Empresa e nos canais de contato disponibilizados. A plataforma Lovable fornece a infraestrutura técnica de
            hospedagem e os recursos de segurança padrão, enquanto o conteúdo, os dados inseridos e as decisões de uso
            são de responsabilidade do proprietário da aplicação.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Dados que Coletamos</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          <p className="mb-2">Podemos coletar e processar os seguintes tipos de dados:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Dados da conta</strong>: nome, e-mail, telefone e credenciais de acesso utilizadas para autenticação.</li>
            <li><strong>Dados de clientes</strong>: nome, telefone, e-mail, endereço, CEP, documentos e outras informações inseridas pelos usuários para gestão comercial.</li>
            <li><strong>Dados de serviços</strong>: descrições de serviços, orçamentos, agendamentos, relatórios, fotos, assinaturas digitais e informações financeiras.</li>
            <li><strong>Dados técnicos</strong>: endereço IP, tipo de navegador, dispositivo, logs de acesso e cookies estritamente necessários ao funcionamento da aplicação.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Finalidades do Tratamento</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          <ul className="list-disc pl-5 space-y-1">
            <li>Permitir o acesso e a utilização das funcionalidades do aplicativo.</li>
            <li>Gerenciar clientes, orçamentos, agenda, financeiro e relatórios de serviços.</li>
            <li>Emitir documentos, relatórios e comprovantes de prestação de serviço.</li>
            <li>Enviar comunicações operacionais, lembretes e alertas de pagamento.</li>
            <li>Garantir a segurança, integridade e melhoria contínua do sistema.</li>
            <li>Cumprir obrigações legais e regulatórias.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. Base Legal para o Tratamento</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-3">
          <p>
            O tratamento de dados pessoais é realizado com base nas hipóteses previstas na Lei Geral de Proteção de
            Dados (LGPD — Lei nº 13.709/2018), principalmente execução de contrato, cumprimento de obrigação legal,
            legítimo interesse e consentimento, quando aplicável.
          </p>
          <p>
            Ao utilizar o aplicativo e inserir dados de clientes, o usuário empresarial declara possuir autorização para
            o tratamento dessas informações e assume a responsabilidade por informar seus clientes sobre o tratamento.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">5. Compartilhamento de Dados</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-3">
          <p>
            Não vendemos dados pessoais. Podemos compartilhar informações apenas nas seguintes situações:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Com prestadores de serviços essenciais à operação da aplicação (hospedagem, infraestrutura, suporte técnico), mediante contratos e salvaguardas adequadas.</li>
            <li>Para cumprimento de obrigação legal, determinação judicial ou requisição de autoridade competente.</li>
            <li>Com consentimento expresso do titular, quando necessário.</li>
          </ul>
          <p>
            A plataforma Lovable atua como operador de infraestrutura, processando dados conforme as instruções do
            Responsável pelo Aplicativo e de acordo com suas próprias políticas de privacidade e segurança.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">6. Retenção e Exclusão</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-3">
          <p>
            Os dados são mantidos pelo tempo necessário para cumprir as finalidades descritas nesta política e atender
            às obrigações legais, contábeis e fiscais aplicáveis. Após esse período, os dados podem ser anonimizados ou
            excluídos de forma segura.
          </p>
          <p>
            O usuário administrador pode arquivar, excluir ou restaurar registros diretamente no aplicativo, conforme as
            funcionalidades disponíveis. A exclusão permanente deve ser solicitada ao Responsável pelo Aplicativo quando
            não disponível em interface própria.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">7. Segurança da Informação</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-3">
          <p>
            Adotamos medidas técnicas e organizacionais para proteger os dados contra acesso não autorizado, perda,
            alteração, destruição ou vazamento, incluindo criptografia em trânsito, controle de acesso, autenticação e
            auditoria de alterações.
          </p>
          <p>
            A segurança também depende do comportamento dos usuários. Recomendamos o uso de senhas fortes, a
            manutenção da confidencialidade das credenciais e a ativação de recursos adicionais de proteção quando
            disponíveis.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">8. Direitos dos Titulares</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          <p className="mb-2">Nos termos da LGPD, os titulares de dados pessoais podem exercer os seguintes direitos:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Confirmação da existência de tratamento.</li>
            <li>Acesso aos dados pessoais.</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos.</li>
            <li>Portabilidade dos dados, quando aplicável.</li>
            <li>Revogação do consentimento, quando o tratamento se basear nessa hipótese.</li>
          </ul>
          <p className="mt-2">
            Para exercer seus direitos, o titular pode entrar em contato com o Responsável pelo Aplicativo pelos canais
            indicados na página da Empresa.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">9. Cookies e Tecnologias Semelhantes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-3">
          <p>
            O Aplicativo pode utilizar cookies e tecnologias similares estritamente necessários ao funcionamento da
            aplicação, como autenticação de sessão, preferências de interface e funcionamento offline. Não utilizamos
            cookies para rastreamento comportamental ou publicidade.
          </p>
          <p>
            O usuário pode configurar seu navegador para recusar cookies, mas algumas funcionalidades do Aplicativo
            poderão deixar de funcionar corretamente.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">10. Mudanças nesta Política</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          <p>
            Esta Política de Privacidade pode ser atualizada periodicamente para refletir melhorias na aplicação ou
            alterações na legislação. A data da última atualização será sempre indicada no topo desta página. Recomenda-se
            a revisão regular deste documento.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">11. Contato</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          <p>
            Para dúvidas, solicitações ou exercício de direitos relacionados à privacidade e proteção de dados, entre em
            contato com o Responsável pelo Aplicativo através dos dados disponíveis na página da Empresa.
          </p>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Esta política foi elaborada para ajudar a promover transparência no tratamento de dados pessoais. O conteúdo
        específico sobre prazos de retenção, subprocessores contratados e canais de atendimento deve ser complementado
        pelo Responsável pelo Aplicativo conforme a realidade operacional do negócio.
      </p>
    </div>
  );
}
