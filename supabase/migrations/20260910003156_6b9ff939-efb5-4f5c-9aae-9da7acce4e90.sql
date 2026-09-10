-- 1) Enum de papéis dentro da organização
DO $$ BEGIN
  CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Membros da organização
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 3) Funções de apoio (security definer evita recursão nas policies)
CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_org uuid, _role public.org_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org AND user_id = auth.uid() AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_manager(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org AND user_id = auth.uid() AND role IN ('owner','admin')
  ) OR EXISTS (
    SELECT 1 FROM public.organizations WHERE id = _org AND owner_id = auth.uid()
  );
$$;

-- 4) Policies de organization_members
DROP POLICY IF EXISTS members_select ON public.organization_members;
CREATE POLICY members_select ON public.organization_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(organization_id));

DROP POLICY IF EXISTS members_insert ON public.organization_members;
CREATE POLICY members_insert ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_manager(organization_id)
    OR (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.owner_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS members_update ON public.organization_members;
CREATE POLICY members_update ON public.organization_members
  FOR UPDATE TO authenticated
  USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS members_delete ON public.organization_members;
CREATE POLICY members_delete ON public.organization_members
  FOR DELETE TO authenticated
  USING (public.is_org_manager(organization_id));

-- 5) Contadores por organização
CREATE TABLE IF NOT EXISTS public.organization_counters (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('orcamento','relatorio')),
  proximo integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, tipo)
);

GRANT SELECT ON public.organization_counters TO authenticated;
GRANT ALL ON public.organization_counters TO service_role;
ALTER TABLE public.organization_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS counters_select ON public.organization_counters;
CREATE POLICY counters_select ON public.organization_counters
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR organization_id = public.current_org_id());

-- 6) Empresa ativa passa a considerar a lista de membros
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
      ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, created_at
      LIMIT 1),
    (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  );
$$;

-- 7) Numeração atômica por organização
CREATE OR REPLACE FUNCTION public.next_number(_tipo text)
RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _org uuid;
  _n integer;
BEGIN
  IF _tipo NOT IN ('orcamento','relatorio') THEN
    RAISE EXCEPTION 'tipo invalido';
  END IF;
  _org := public.current_org_id();
  IF _org IS NULL THEN
    RAISE EXCEPTION 'sem organizacao ativa';
  END IF;

  INSERT INTO public.organization_counters (organization_id, tipo, proximo)
  VALUES (_org, _tipo, 2)
  ON CONFLICT (organization_id, tipo)
  DO UPDATE SET proximo = public.organization_counters.proximo + 1, updated_at = now()
  RETURNING proximo - 1 INTO _n;

  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.next_number(text) FROM public;
GRANT EXECUTE ON FUNCTION public.next_number(text) TO authenticated;

-- 8) Ajuste da numeração inicial a partir de um valor conhecido
CREATE OR REPLACE FUNCTION public.seed_counter(_tipo text, _proximo integer)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid;
BEGIN
  IF _tipo NOT IN ('orcamento','relatorio') THEN
    RAISE EXCEPTION 'tipo invalido';
  END IF;
  _org := public.current_org_id();
  IF _org IS NULL THEN
    RAISE EXCEPTION 'sem organizacao ativa';
  END IF;
  INSERT INTO public.organization_counters (organization_id, tipo, proximo)
  VALUES (_org, _tipo, GREATEST(_proximo, 1))
  ON CONFLICT (organization_id, tipo)
  DO UPDATE SET proximo = GREATEST(public.organization_counters.proximo, GREATEST(_proximo, 1)), updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.seed_counter(text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.seed_counter(text, integer) TO authenticated;

-- 9) Backfill: donos atuais viram membros 'owner'
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT o.id, o.owner_id, 'owner'::public.org_role
FROM public.organizations o
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- perfis vinculados a uma organização entram como membros
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT p.organization_id, p.user_id,
       CASE WHEN p.role = 'owner' THEN 'owner' WHEN p.role = 'admin' THEN 'admin' ELSE 'member' END::public.org_role
FROM public.profiles p
WHERE p.organization_id IS NOT NULL
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- 10) Backfill dos contadores a partir do conteúdo já salvo
INSERT INTO public.organization_counters (organization_id, tipo, proximo)
SELECT a.organization_id, 'orcamento',
       GREATEST(COALESCE((a.payload->>'proximoOrcamento')::int, 1), 1)
FROM public.app_data a
ON CONFLICT (organization_id, tipo) DO NOTHING;

INSERT INTO public.organization_counters (organization_id, tipo, proximo)
SELECT a.organization_id, 'relatorio',
       GREATEST(COALESCE((a.payload->>'proximoRelatorio')::int, 1), 1)
FROM public.app_data a
ON CONFLICT (organization_id, tipo) DO NOTHING;

-- 11) Gatilho de updated_at para membros
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS update_org_members_updated_at ON public.organization_members;
CREATE TRIGGER update_org_members_updated_at
BEFORE UPDATE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();