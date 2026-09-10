-- =========================
-- ETAPA 03: tabelas relacionais por entidade
-- =========================

-- CUSTOMERS
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  legacy_id text,
  nome text NOT NULL DEFAULT '',
  telefone text, whatsapp text, email text, documento text,
  endereco text, cep text, rua text, numero text, complemento text,
  bairro text, cidade text, estado text, observacoes text,
  frequencia text NOT NULL DEFAULT 'avulso',
  arquivado boolean NOT NULL DEFAULT false,
  criado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX customers_org_legacy_uidx ON public.customers(organization_id, legacy_id) WHERE legacy_id IS NOT NULL;
CREATE INDEX customers_org_idx ON public.customers(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY customers_all ON public.customers FOR ALL TO authenticated
  USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- SERVICES
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  legacy_id text,
  nome text NOT NULL DEFAULT '',
  descricao text,
  valor numeric NOT NULL DEFAULT 0,
  tempo_estimado text,
  arquivado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX services_org_legacy_uidx ON public.services(organization_id, legacy_id) WHERE legacy_id IS NOT NULL;
CREATE INDEX services_org_idx ON public.services(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY services_all ON public.services FOR ALL TO authenticated
  USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- QUOTES
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  legacy_id text,
  numero integer NOT NULL DEFAULT 1,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_legacy_id text,
  prazo text,
  observacoes text,
  descricao_servicos text NOT NULL DEFAULT '',
  validade_dias integer NOT NULL DEFAULT 15,
  formas_pagamento jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'rascunho',
  escopo jsonb NOT NULL DEFAULT '[]'::jsonb,
  nao_incluso jsonb NOT NULL DEFAULT '[]'::jsonb,
  condicoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  diferencial text,
  desconto numeric,
  data_prevista text,
  hora_prevista text,
  fotos_antes jsonb NOT NULL DEFAULT '[]'::jsonb,
  fotos_depois jsonb NOT NULL DEFAULT '[]'::jsonb,
  versao integer,
  arquivado boolean NOT NULL DEFAULT false,
  criado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX quotes_org_legacy_uidx ON public.quotes(organization_id, legacy_id) WHERE legacy_id IS NOT NULL;
CREATE INDEX quotes_org_idx ON public.quotes(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY quotes_all ON public.quotes FOR ALL TO authenticated
  USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- QUOTE ITEMS
CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  service_legacy_id text,
  posicao integer NOT NULL DEFAULT 0,
  descricao text NOT NULL DEFAULT '',
  quantidade numeric NOT NULL DEFAULT 1,
  valor_unit numeric NOT NULL DEFAULT 0,
  categoria text,
  unidade text,
  escopo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX quote_items_pos_uidx ON public.quote_items(quote_id, posicao);
CREATE INDEX quote_items_org_idx ON public.quote_items(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_items TO authenticated;
GRANT ALL ON public.quote_items TO service_role;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY quote_items_all ON public.quote_items FOR ALL TO authenticated
  USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- APPOINTMENTS
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  legacy_id text,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_legacy_id text,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  service_legacy_id text,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  quote_legacy_id text,
  report_id uuid,
  report_legacy_id text,
  titulo text NOT NULL DEFAULT '',
  data timestamptz,
  data_texto text,
  observacoes text,
  status text NOT NULL DEFAULT 'agendado',
  valor numeric,
  hora_inicio text,
  hora_fim text,
  responsavel text,
  endereco text,
  recorrencia text,
  intervalo_dias integer,
  arquivado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX appointments_org_legacy_uidx ON public.appointments(organization_id, legacy_id) WHERE legacy_id IS NOT NULL;
CREATE INDEX appointments_org_idx ON public.appointments(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY appointments_all ON public.appointments FOR ALL TO authenticated
  USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- SERVICE REPORTS
CREATE TABLE public.service_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  legacy_id text,
  numero integer NOT NULL DEFAULT 1,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  appointment_legacy_id text,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_legacy_id text,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  quote_legacy_id text,
  servico_executado text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  observacoes text,
  status text NOT NULL DEFAULT 'sucesso',
  data_execucao text,
  hora_inicio text,
  hora_fim text,
  responsavel text,
  valor numeric,
  assinatura_tecnico text,
  assinatura_cliente text,
  valor_orcamento numeric,
  valor_recebido numeric,
  formas_pagamento_recebimento jsonb NOT NULL DEFAULT '[]'::jsonb,
  parcelas integer,
  taxa_cartao numeric,
  observacoes_financeiras text,
  data_pagamento text,
  situacao_pagamento text,
  recebido_por text,
  arquivado boolean NOT NULL DEFAULT false,
  criado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX service_reports_org_legacy_uidx ON public.service_reports(organization_id, legacy_id) WHERE legacy_id IS NOT NULL;
CREATE INDEX service_reports_org_idx ON public.service_reports(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_reports TO authenticated;
GRANT ALL ON public.service_reports TO service_role;
ALTER TABLE public.service_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_reports_all ON public.service_reports FOR ALL TO authenticated
  USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_report_fkey FOREIGN KEY (report_id)
  REFERENCES public.service_reports(id) ON DELETE SET NULL;

-- REPORT PHOTOS
CREATE TABLE public.report_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  report_id uuid NOT NULL REFERENCES public.service_reports(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  posicao integer NOT NULL DEFAULT 0,
  conteudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX report_photos_uidx ON public.report_photos(report_id, tipo, posicao);
CREATE INDEX report_photos_org_idx ON public.report_photos(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_photos TO authenticated;
GRANT ALL ON public.report_photos TO service_role;
ALTER TABLE public.report_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY report_photos_all ON public.report_photos FOR ALL TO authenticated
  USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- FINANCIAL TRANSACTIONS
CREATE TABLE public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  legacy_id text,
  tipo text NOT NULL DEFAULT 'entrada',
  descricao text NOT NULL DEFAULT '',
  valor numeric NOT NULL DEFAULT 0,
  data text,
  categoria text,
  pago boolean,
  vencimento text,
  origem_tipo text,
  origem_legacy_id text,
  origin_quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  origin_appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  arquivado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX financial_org_legacy_uidx ON public.financial_transactions(organization_id, legacy_id) WHERE legacy_id IS NOT NULL;
CREATE INDEX financial_org_idx ON public.financial_transactions(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_transactions TO authenticated;
GRANT ALL ON public.financial_transactions TO service_role;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY financial_all ON public.financial_transactions FOR ALL TO authenticated
  USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- DESCRIPTION TEMPLATES
CREATE TABLE public.description_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  legacy_id text,
  nome text NOT NULL DEFAULT '',
  conteudo text NOT NULL DEFAULT '',
  favorito boolean NOT NULL DEFAULT false,
  criado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX templates_org_legacy_uidx ON public.description_templates(organization_id, legacy_id) WHERE legacy_id IS NOT NULL;
CREATE INDEX templates_org_idx ON public.description_templates(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.description_templates TO authenticated;
GRANT ALL ON public.description_templates TO service_role;
ALTER TABLE public.description_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY templates_all ON public.description_templates FOR ALL TO authenticated
  USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- ORGANIZATION SETTINGS
CREATE TABLE public.organization_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id),
  empresa jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_version text NOT NULL DEFAULT 'A',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.organization_settings TO authenticated;
GRANT ALL ON public.organization_settings TO service_role;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_settings_select ON public.organization_settings FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY org_settings_insert ON public.organization_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY org_settings_update ON public.organization_settings FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  legacy_id text,
  entidade text NOT NULL,
  entidade_id text,
  entidade_nome text,
  acao text NOT NULL,
  campo text,
  antes text,
  depois text,
  data timestamptz,
  user_id uuid,
  usuario text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX audit_org_legacy_uidx ON public.audit_logs(organization_id, legacy_id) WHERE legacy_id IS NOT NULL;
CREATE INDEX audit_org_idx ON public.audit_logs(organization_id);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_select ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY audit_insert ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

-- updated_at triggers
CREATE TRIGGER customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER quotes_updated BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER quote_items_updated BEFORE UPDATE ON public.quote_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER appointments_updated BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER service_reports_updated BEFORE UPDATE ON public.service_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER financial_updated BEFORE UPDATE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER templates_updated BEFORE UPDATE ON public.description_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER org_settings_updated BEFORE UPDATE ON public.organization_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();