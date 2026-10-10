CREATE OR REPLACE FUNCTION public.assign_quote_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE saved_number integer;
BEGIN
  IF NOT public.is_org_member(NEW.organization_id) AND current_user <> 'service_role' THEN
    RAISE EXCEPTION 'Empresa não autorizada' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('quote-number:' || NEW.organization_id::text, 0));
  IF TG_OP = 'UPDATE' THEN
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'A empresa do orçamento não pode ser alterada';
    END IF;
    NEW.numero := OLD.numero;
    RETURN NEW;
  END IF;
  SELECT numero INTO saved_number FROM public.quotes WHERE id = NEW.id AND organization_id = NEW.organization_id;
  IF FOUND THEN
    NEW.numero := saved_number;
  ELSIF NEW.numero IS NULL OR NEW.numero <= 0 THEN
    SELECT COALESCE(MAX(numero), 0) + 1 INTO NEW.numero FROM public.quotes WHERE organization_id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.assign_quote_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_quote_number() TO authenticated, service_role;
CREATE TRIGGER quotes_assign_number BEFORE INSERT OR UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.assign_quote_number();