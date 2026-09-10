DROP POLICY IF EXISTS empresa_arquivos_select ON storage.objects;
CREATE POLICY empresa_arquivos_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'empresa-arquivos'
    AND (storage.foldername(name))[1] = public.current_org_id()::text
  );

DROP POLICY IF EXISTS empresa_arquivos_insert ON storage.objects;
CREATE POLICY empresa_arquivos_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'empresa-arquivos'
    AND (storage.foldername(name))[1] = public.current_org_id()::text
  );

DROP POLICY IF EXISTS empresa_arquivos_update ON storage.objects;
CREATE POLICY empresa_arquivos_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'empresa-arquivos'
    AND (storage.foldername(name))[1] = public.current_org_id()::text
  )
  WITH CHECK (
    bucket_id = 'empresa-arquivos'
    AND (storage.foldername(name))[1] = public.current_org_id()::text
  );

DROP POLICY IF EXISTS empresa_arquivos_delete ON storage.objects;
CREATE POLICY empresa_arquivos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'empresa-arquivos'
    AND (storage.foldername(name))[1] = public.current_org_id()::text
  );