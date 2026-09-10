-- 1) current_org_id: a queda para profiles só vale quando o usuário é o dono da empresa
CREATE OR REPLACE FUNCTION public.current_org_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
      ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, created_at
      LIMIT 1),
    (SELECT p.organization_id FROM public.profiles p
      JOIN public.organizations o ON o.id = p.organization_id
      WHERE p.user_id = auth.uid() AND o.owner_id = auth.uid()
      LIMIT 1)
  );
$function$;

-- 2) o próprio cadastro não pode apontar para empresa de terceiros nem se promover
CREATE OR REPLACE FUNCTION public.profile_self_allowed(_org uuid, _role text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    (_org IS NULL OR public.is_org_member(_org) OR EXISTS (
       SELECT 1 FROM public.organizations WHERE id = _org AND owner_id = auth.uid()
     ))
    AND (
      _role IS NULL
      OR _role NOT IN ('owner','admin','super_admin')
      OR (_org IS NOT NULL AND public.is_org_manager(_org))
    );
$function$;

DROP POLICY IF EXISTS profile_insert_self ON public.profiles;
DROP POLICY IF EXISTS profile_update_self ON public.profiles;

CREATE POLICY profile_insert_self ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.profile_self_allowed(organization_id, role));

CREATE POLICY profile_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND public.profile_self_allowed(organization_id, role));