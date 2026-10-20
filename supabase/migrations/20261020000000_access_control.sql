-- Access approval, owner-only administration and database-level access gating.
-- The configured owner UUID is provisioned only by the authenticated server bootstrap.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.app_owner_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  owner_user_id uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE private.app_owner_config FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.acessos (
  user_id uuid PRIMARY KEY,
  email text,
  status text NOT NULL CHECK (status IN ('pendente', 'ativo', 'bloqueado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  liberado_em timestamptz,
  observacao text
);

CREATE TABLE IF NOT EXISTS public.emails_pre_liberados (
  email text PRIMARY KEY CHECK (email = lower(btrim(email))),
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  target_user_id uuid,
  email_snapshot text,
  action text NOT NULL,
  previous_status text,
  new_status text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.acessos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails_pre_liberados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_access_audit ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.acessos TO authenticated;
GRANT ALL ON public.acessos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emails_pre_liberados TO authenticated;
GRANT ALL ON public.emails_pre_liberados TO service_role;
GRANT SELECT ON public.admin_access_audit TO authenticated;
GRANT ALL ON public.admin_access_audit TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- Legacy global roles remain in the enum/data for a non-destructive migration,
-- but new or updated rows may contain only the supported app roles.
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_allowed_app_roles;
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_allowed_app_roles
  CHECK (role::text IN ('admin', 'user')) NOT VALID;

-- Organization roles were already backfilled to organization_members. Preserve any
-- remaining valid legacy values there, then stop storing application roles in profiles.
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT p.organization_id,
       p.user_id,
       CASE p.role
         WHEN 'owner' THEN 'owner'::public.org_role
         WHEN 'admin' THEN 'admin'::public.org_role
         ELSE 'member'::public.org_role
       END
FROM public.profiles p
WHERE p.organization_id IS NOT NULL
  AND p.role IS NOT NULL
ON CONFLICT (organization_id, user_id) DO NOTHING;

ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;
UPDATE public.profiles SET role = NULL WHERE role IS NOT NULL;

CREATE OR REPLACE FUNCTION public.profile_self_allowed(_org uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (_role IS NULL)
     AND (_org IS NULL OR public.is_org_member(_org) OR EXISTS (
       SELECT 1 FROM public.organizations WHERE id = _org AND owner_id = auth.uid()
     ));
$$;

-- All users present at migration time keep access. New users start pending unless
-- their e-mail is pre-released or their authenticated UUID is the configured owner.
INSERT INTO public.acessos (user_id, email, status, created_at, liberado_em, observacao)
SELECT u.id,
       lower(nullif(btrim(u.email), '')),
       'ativo',
       COALESCE(u.created_at, now()),
       now(),
       'Acesso preservado pela migração de controle de acesso'
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::public.app_role
FROM auth.users u
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT CASE
    WHEN _role::text = 'admin' THEN EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN private.app_owner_config owner_cfg
        ON owner_cfg.id = 1 AND owner_cfg.owner_user_id = ur.user_id
      WHERE ur.user_id = _user_id AND ur.role::text = 'admin'
        AND (
          _user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM private.app_owner_config caller_cfg
            WHERE caller_cfg.id = 1 AND caller_cfg.owner_user_id = auth.uid()
          )
        )
    )
    WHEN _role::text = 'user' THEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id AND ur.role::text = 'user'
        AND (
          _user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM private.app_owner_config caller_cfg
            WHERE caller_cfg.id = 1 AND caller_cfg.owner_user_id = auth.uid()
          )
        )
    )
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_acesso_ativo(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN _user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role)
      THEN EXISTS (
        SELECT 1 FROM public.acessos a
        WHERE a.user_id = _user_id AND a.status = 'ativo'
      )
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_access_state()
RETURNS TABLE(status text, is_admin boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT COALESCE(
           (SELECT a.status FROM public.acessos a WHERE a.user_id = auth.uid()),
           'pendente'
         ),
         public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.configure_app_owner(_owner_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  IF _owner_user_id IS NULL THEN
    RAISE EXCEPTION 'owner UUID is required';
  END IF;

  INSERT INTO private.app_owner_config (id, owner_user_id, updated_at)
  VALUES (1, _owner_user_id, now())
  ON CONFLICT (id) DO UPDATE
    SET owner_user_id = EXCLUDED.owner_user_id,
        updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_owner_user_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.acessos AS current_access (user_id, email, status, created_at, liberado_em, observacao)
  SELECT u.id,
         lower(nullif(btrim(u.email), '')),
         'ativo',
         COALESCE(u.created_at, now()),
         now(),
         'Acesso do proprietário configurado no servidor'
  FROM auth.users u
  WHERE u.id = _owner_user_id
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        status = 'ativo',
        liberado_em = COALESCE(current_access.liberado_em, now()),
        observacao = 'Acesso do proprietário configurado no servidor';
END;
$$;

REVOKE ALL ON FUNCTION public.configure_app_owner(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.configure_app_owner(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_email text := lower(nullif(btrim(NEW.email), ''));
  v_is_owner boolean := false;
  v_pre_liberado boolean := false;
  v_role public.app_role := 'user'::public.app_role;
  v_status text := 'pendente';
BEGIN
  IF v_email IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(v_email, 0));
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM private.app_owner_config c
    WHERE c.id = 1 AND c.owner_user_id = NEW.id
  ) INTO v_is_owner;

  IF v_email IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.emails_pre_liberados e WHERE e.email = v_email
    ) INTO v_pre_liberado;
  END IF;

  IF v_is_owner THEN
    v_role := 'admin'::public.app_role;
    v_status := 'ativo';
  ELSIF v_pre_liberado THEN
    v_status := 'ativo';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.acessos (user_id, email, status, created_at, liberado_em, observacao)
  VALUES (
    NEW.id,
    v_email,
    v_status,
    COALESCE(NEW.created_at, now()),
    CASE WHEN v_status = 'ativo' THEN now() ELSE NULL END,
    CASE
      WHEN v_is_owner THEN 'Proprietário identificado pelo UUID configurado no servidor'
      WHEN v_pre_liberado THEN 'E-mail pré-liberado pelo administrador'
      ELSE NULL
    END
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_access ON auth.users;
CREATE TRIGGER on_auth_user_created_access
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_access();

CREATE OR REPLACE FUNCTION public.sync_auth_email_to_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.acessos
    SET email = lower(nullif(btrim(NEW.email), ''))
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated_access ON auth.users;
CREATE TRIGGER on_auth_user_email_updated_access
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_auth_email_to_access();

CREATE OR REPLACE FUNCTION public.admin_set_access_status(
  _target_user_id uuid,
  _status text,
  _observacao text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_email text;
  v_previous text;
  v_note text := nullif(btrim(_observacao), '');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    INSERT INTO public.admin_access_audit (actor_user_id, target_user_id, action, observacao)
    VALUES (auth.uid(), _target_user_id, 'tentativa_negada_status', 'Tentativa sem permissão administrativa');
    RETURN false;
  END IF;

  IF _status NOT IN ('ativo', 'bloqueado') THEN
    RAISE EXCEPTION 'status inválido';
  END IF;

  IF _target_user_id IS NULL OR _target_user_id = auth.uid()
     OR public.has_role(_target_user_id, 'admin'::public.app_role) THEN
    INSERT INTO public.admin_access_audit (actor_user_id, target_user_id, action, observacao)
    VALUES (auth.uid(), _target_user_id, 'tentativa_negada_status', 'Alteração do acesso administrativo protegida');
    RETURN false;
  END IF;

  SELECT a.email, a.status INTO v_email, v_previous
  FROM public.acessos a
  WHERE a.user_id = _target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'acesso não encontrado';
  END IF;

  UPDATE public.acessos
  SET status = _status,
      liberado_em = CASE WHEN _status = 'ativo' THEN now() ELSE liberado_em END,
      observacao = COALESCE(v_note, CASE WHEN _status = 'ativo' THEN 'Acesso liberado pelo administrador' ELSE 'Acesso bloqueado pelo administrador' END)
  WHERE user_id = _target_user_id;

  INSERT INTO public.admin_access_audit (
    actor_user_id, target_user_id, email_snapshot, action,
    previous_status, new_status, observacao
  ) VALUES (
    auth.uid(), _target_user_id, v_email,
    CASE WHEN _status = 'ativo' THEN 'acesso_liberado' ELSE 'acesso_bloqueado' END,
    v_previous, _status, v_note
  );

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_preliberar_email(_email text, _observacao text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_email text := lower(btrim(COALESCE(_email, '')));
  v_target_user_id uuid;
  v_previous text;
  v_note text := nullif(btrim(_observacao), '');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    INSERT INTO public.admin_access_audit (actor_user_id, email_snapshot, action, observacao)
    VALUES (auth.uid(), NULL, 'tentativa_negada_preliberacao', 'Tentativa sem permissão administrativa');
    RETURN 'denied';
  END IF;

  IF v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'e-mail inválido';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_email, 0));

  SELECT a.user_id, a.status INTO v_target_user_id, v_previous
  FROM public.acessos a
  WHERE lower(a.email) = v_email
  FOR UPDATE;

  IF FOUND THEN
    IF public.has_role(v_target_user_id, 'admin'::public.app_role) THEN
      INSERT INTO public.admin_access_audit (actor_user_id, target_user_id, email_snapshot, action, observacao)
      VALUES (auth.uid(), v_target_user_id, v_email, 'tentativa_negada_preliberacao', 'Conta do proprietário protegida');
      RETURN 'denied';
    END IF;

    UPDATE public.acessos
    SET status = 'ativo',
        liberado_em = now(),
        observacao = COALESCE(v_note, 'Acesso liberado após confirmação de compra')
    WHERE user_id = v_target_user_id;

    INSERT INTO public.admin_access_audit (
      actor_user_id, target_user_id, email_snapshot, action,
      previous_status, new_status, observacao
    ) VALUES (
      auth.uid(), v_target_user_id, v_email, 'acesso_liberado_por_email',
      v_previous, 'ativo', v_note
    );
    RETURN 'liberado';
  END IF;

  INSERT INTO public.emails_pre_liberados (email)
  VALUES (v_email)
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO public.admin_access_audit (actor_user_id, email_snapshot, action, observacao)
  VALUES (auth.uid(), v_email, 'email_pre_liberado', v_note);
  RETURN 'pre_liberado';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remover_email_pre_liberado(_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_email text := lower(btrim(COALESCE(_email, '')));
  v_deleted integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    INSERT INTO public.admin_access_audit (actor_user_id, action, observacao)
    VALUES (auth.uid(), 'tentativa_negada_remocao_preliberacao', 'Tentativa sem permissão administrativa');
    RETURN false;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_email, 0));
  DELETE FROM public.emails_pre_liberados WHERE email = v_email;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted > 0 THEN
    INSERT INTO public.admin_access_audit (actor_user_id, email_snapshot, action)
    VALUES (auth.uid(), v_email, 'email_pre_liberado_removido');
  END IF;

  RETURN v_deleted > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_access_status(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_preliberar_email(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_remover_email_pre_liberado(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_access_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_preliberar_email(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remover_email_pre_liberado(text) TO authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_acesso_ativo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_acesso_ativo(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_access_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_access_state() TO authenticated;

DROP POLICY IF EXISTS acessos_select_own_or_admin ON public.acessos;
CREATE POLICY acessos_select_own_or_admin ON public.acessos
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS acessos_admin_insert ON public.acessos;
CREATE POLICY acessos_admin_insert ON public.acessos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS acessos_admin_update ON public.acessos;
CREATE POLICY acessos_admin_update ON public.acessos
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS acessos_admin_delete ON public.acessos;
CREATE POLICY acessos_admin_delete ON public.acessos
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS emails_pre_liberados_admin_all ON public.emails_pre_liberados;
CREATE POLICY emails_pre_liberados_admin_all ON public.emails_pre_liberados
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS admin_access_audit_owner_read ON public.admin_access_audit;
CREATE POLICY admin_access_audit_owner_read ON public.admin_access_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS user_roles_owner_manage ON public.user_roles;
CREATE POLICY user_roles_owner_manage ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- This is restrictive so existing organization-isolation policies remain in force
-- and are ANDed with the account access check.
DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'organizations', 'profiles', 'app_data', 'organization_members', 'organization_counters',
    'customers', 'services', 'quotes', 'quote_items', 'appointments', 'service_reports',
    'report_photos', 'financial_transactions', 'description_templates', 'organization_settings',
    'audit_logs'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS access_active_gate ON public.%I', v_table);
    EXECUTE format(
      'CREATE POLICY access_active_gate ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_acesso_ativo(auth.uid())) WITH CHECK (public.is_acesso_ativo(auth.uid()))',
      v_table
    );
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS access_active_gate ON storage.objects;
CREATE POLICY access_active_gate ON storage.objects AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (bucket_id <> 'empresa-arquivos' OR public.is_acesso_ativo(auth.uid()))
  WITH CHECK (bucket_id <> 'empresa-arquivos' OR public.is_acesso_ativo(auth.uid()));
