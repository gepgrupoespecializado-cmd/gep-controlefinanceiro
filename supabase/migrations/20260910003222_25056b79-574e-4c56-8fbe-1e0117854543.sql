REVOKE ALL ON FUNCTION public.current_org_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_org_role(uuid, public.org_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_manager(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.next_number(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.seed_counter(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, public.org_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_manager(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_number(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.seed_counter(text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;