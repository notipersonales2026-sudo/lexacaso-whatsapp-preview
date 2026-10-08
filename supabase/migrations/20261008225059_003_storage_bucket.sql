/*
# LEXACASO — Storage bucket para documentos privados

## Descripción
Crea el bucket 'documentos' para almacenamiento privado de archivos jurídicos.
Los archivos se organizan por usuario: `user_id/expediente_id/nombre_archivo`.

## Seguridad
- El bucket es privado (no público).
- Políticas de storage:
  - SELECT: usuarios pueden ver sus propios archivos; admin ve todos.
  - INSERT: usuarios pueden subir a su propia carpeta; admin puede subir a cualquier carpeta.
  - UPDATE: solo admin.
  - DELETE: solo admin.
  - Los path deben contener el user_id del usuario autenticado.
*/
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- SELECT: ver/descargar propios o admin todos
DROP POLICY IF EXISTS "select_own_documentos_storage" ON storage.objects;
CREATE POLICY "select_own_documentos_storage" ON storage.objects FOR SELECT
  TO authenticated USING (
    bucket_id = 'documentos' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()
    )
  );

-- INSERT: subir a propia carpeta o admin a cualquiera
DROP POLICY IF EXISTS "insert_own_documentos_storage" ON storage.objects;
CREATE POLICY "insert_own_documentos_storage" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'documentos' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()
    )
  );

-- UPDATE: solo admin
DROP POLICY IF EXISTS "update_admin_documentos_storage" ON storage.objects;
CREATE POLICY "update_admin_documentos_storage" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'documentos' AND public.is_admin())
  WITH CHECK (bucket_id = 'documentos' AND public.is_admin());

-- DELETE: solo admin
DROP POLICY IF EXISTS "delete_admin_documentos_storage" ON storage.objects;
CREATE POLICY "delete_admin_documentos_storage" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'documentos' AND public.is_admin());
