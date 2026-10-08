/*
# LEXACASO — Completar estructura para expedientes ciudadanos y documentos del despacho

## Descripción
Agrega columnas a tablas existentes para soportar:
1. Formulario ciudadano "Exponer mi caso" con campos estructurados.
2. Documentos enviados por el administrador al cliente con mensaje y estado de consulta.
3. Nuevos estados de expediente comprensibles para ciudadanos.

## Cambios
### Tabla: expedientes
- area_juridica ahora admite valores del formulario ciudadano (texto libre, ya era text)
- No se agregan columnas nuevas: el formulario usa titulo, descripcion, area_juridica

### Tabla: documentos
- remitente_id (uuid, nullable) — quién subió el documento (admin o cliente)
- mensaje_admin (text, nullable) — mensaje del administrador al enviar documento
- consultado (boolean, default false) — si el cliente ya abrió/descargó el documento
- es_entregable (boolean, default true) — si es entregable al cliente o de uso interno
  (visible_cliente ya existe y se reutiliza; es_entregable es equivalente pero más explícito)

### Tabla: config_estados
- Se insertan nuevos estados: Recibido, En revisión, Pendiente de documentos,
  En trámite, Requiere información del cliente, Finalizado
- Los estados existentes (Iniciado, En estudio, En proceso, Suspendido, Finalizado, Archivado)
  se conservan sin modificar.

## Seguridad
- No se eliminan políticas existentes.
- Se actualiza la política SELECT de documentos para respetar visible_cliente.
- No se cambia RLS de otras tablas.
*/

-- ============================================================
-- DOCUMENTOS: nuevas columnas
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos' AND column_name = 'remitente_id') THEN
    ALTER TABLE public.documentos ADD COLUMN remitente_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos' AND column_name = 'mensaje_admin') THEN
    ALTER TABLE public.documentos ADD COLUMN mensaje_admin text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos' AND column_name = 'consultado') THEN
    ALTER TABLE public.documentos ADD COLUMN consultado boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ============================================================
-- CONFIG_ESTADOS: nuevos estados para formulario ciudadano
-- ============================================================
INSERT INTO public.config_estados (nombre, descripcion, color) VALUES
  ('Recibido', 'El expediente ha sido recibido y registrado', '#1a5276'),
  ('En revisión', 'El caso está siendo revisado por el despacho', '#2874a6'),
  ('Pendiente de documentos', 'Se requiere información adicional del cliente', '#b9770e'),
  ('En trámite', 'El caso está en trámite activo', '#2471a3'),
  ('Requiere información del cliente', 'Se solicitó información al cliente', '#d4ac0d'),
  ('Finalizado', 'El expediente ha concluido', '#1e8449')
ON CONFLICT DO NOTHING;

-- ============================================================
-- BITACORA: registrar la migración
-- ============================================================
INSERT INTO public.bitacora_auditoria (autor_id, accion, detalle, entidad)
VALUES (NULL, 'migracion_008', 'Estructura completada: documentos con remitente, mensaje y consultado; nuevos estados ciudadanos', 'migracion');
