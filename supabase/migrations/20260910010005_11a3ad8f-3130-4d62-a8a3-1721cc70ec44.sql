REVOKE ALL ON FUNCTION public.profile_self_allowed(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profile_self_allowed(uuid, text) TO authenticated;