/*
# LEXACASO — Esquema inicial de base de datos

## Descripción
Crea el esquema completo de la plataforma de gestión jurídica LEXACASO.

## Tablas nuevas
1. profiles — Perfiles de usuario vinculados a auth.users
2. expedientes — Casos jurídicos de cada cliente
3. documentos — Documentos asociados a expedientes
4. observaciones — Observaciones del administrador
5. seguimientos — Actuaciones/etapas del caso
6. historial_expedientes — Registro de cambios en expedientes
7. bitacora_auditoria — Registro de acciones administrativas
8. config_categorias — Categorías configurables
9. config_estados — Estados configurables
10. config_tipos_actuacion — Tipos de actuación configurables

## Seguridad
- RLS habilitado en todas las tablas
- is_admin() verifica rol de administrador (placeholder inicial, reemplazada al final)
- Clientes solo acceden a sus propios datos
- Admin tiene acceso completo
*/

-- ============================================================
-- FUNCIÓN PLACEHOLDER: is_admin() — se reemplaza al final
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT false;
$$;

-- ============================================================
-- TABLA: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  nombre_completo text NOT NULL,
  cedula text NOT NULL,
  celular text NOT NULL,
  direccion text NOT NULL,
  rol text NOT NULL DEFAULT 'cliente',
  autorizacion_datos boolean NOT NULL DEFAULT false,
  autorizacion_fecha timestamptz,
  autorizacion_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- ============================================================
-- TABLA: expedientes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expedientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  numero_expediente text,
  titulo text NOT NULL,
  descripcion text,
  area_juridica text,
  estado text NOT NULL DEFAULT 'Iniciado',
  prioridad text NOT NULL DEFAULT 'Normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expedientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_expedientes" ON public.expedientes;
CREATE POLICY "select_own_expedientes" ON public.expedientes FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_expedientes" ON public.expedientes;
CREATE POLICY "insert_own_expedientes" ON public.expedientes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "update_own_expedientes" ON public.expedientes;
CREATE POLICY "update_own_expedientes" ON public.expedientes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "delete_own_expedientes" ON public.expedientes;
CREATE POLICY "delete_own_expedientes" ON public.expedientes FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- ============================================================
-- TABLA: documentos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id uuid NOT NULL REFERENCES public.expedientes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  ruta_storage text NOT NULL,
  tipo_mime text,
  tamano_bytes bigint,
  visible_cliente boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_documentos" ON public.documentos;
CREATE POLICY "select_own_documentos" ON public.documentos FOR SELECT
  TO authenticated USING (
    (auth.uid() = user_id AND visible_cliente = true) OR public.is_admin()
  );

DROP POLICY IF EXISTS "insert_own_documentos" ON public.documentos;
CREATE POLICY "insert_own_documentos" ON public.documentos FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "update_own_documentos" ON public.documentos;
CREATE POLICY "update_own_documentos" ON public.documentos FOR UPDATE
  TO authenticated USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_own_documentos" ON public.documentos;
CREATE POLICY "delete_own_documentos" ON public.documentos FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- TABLA: observaciones
-- ============================================================
CREATE TABLE IF NOT EXISTS public.observaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id uuid NOT NULL REFERENCES public.expedientes(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contenido text NOT NULL,
  visible_cliente boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.observaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_observaciones" ON public.observaciones;
CREATE POLICY "select_own_observaciones" ON public.observaciones FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.expedientes e
      WHERE e.id = observaciones.expediente_id
      AND (e.user_id = auth.uid() AND observaciones.visible_cliente = true)
    ) OR public.is_admin()
  );

DROP POLICY IF EXISTS "insert_own_observaciones" ON public.observaciones;
CREATE POLICY "insert_own_observaciones" ON public.observaciones FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_own_observaciones" ON public.observaciones;
CREATE POLICY "update_own_observaciones" ON public.observaciones FOR UPDATE
  TO authenticated USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_own_observaciones" ON public.observaciones;
CREATE POLICY "delete_own_observaciones" ON public.observaciones FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- TABLA: seguimientos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seguimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id uuid NOT NULL REFERENCES public.expedientes(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_actuacion text NOT NULL,
  descripcion text,
  fecha_actuacion date NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento date,
  estado text NOT NULL DEFAULT 'Pendiente',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seguimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_seguimientos" ON public.seguimientos;
CREATE POLICY "select_own_seguimientos" ON public.seguimientos FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.expedientes e
      WHERE e.id = seguimientos.expediente_id
      AND (e.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "insert_own_seguimientos" ON public.seguimientos;
CREATE POLICY "insert_own_seguimientos" ON public.seguimientos FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_own_seguimientos" ON public.seguimientos;
CREATE POLICY "update_own_seguimientos" ON public.seguimientos FOR UPDATE
  TO authenticated USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_own_seguimientos" ON public.seguimientos;
CREATE POLICY "delete_own_seguimientos" ON public.seguimientos FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- TABLA: historial_expedientes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.historial_expedientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id uuid NOT NULL REFERENCES public.expedientes(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  campo text NOT NULL,
  valor_anterior text,
  valor_nuevo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.historial_expedientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_historial" ON public.historial_expedientes;
CREATE POLICY "select_own_historial" ON public.historial_expedientes FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.expedientes e
      WHERE e.id = historial_expedientes.expediente_id
      AND (e.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "insert_own_historial" ON public.historial_expedientes;
CREATE POLICY "insert_own_historial" ON public.historial_expedientes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = autor_id OR public.is_admin());

-- ============================================================
-- TABLA: bitacora_auditoria
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bitacora_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accion text NOT NULL,
  detalle text,
  entidad text,
  entidad_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bitacora_auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_admin_bitacora" ON public.bitacora_auditoria;
CREATE POLICY "select_admin_bitacora" ON public.bitacora_auditoria FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "insert_admin_bitacora" ON public.bitacora_auditoria;
CREATE POLICY "insert_admin_bitacora" ON public.bitacora_auditoria FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = autor_id);

-- ============================================================
-- TABLA: config_categorias
-- ============================================================
CREATE TABLE IF NOT EXISTS public.config_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.config_categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_categorias" ON public.config_categorias;
CREATE POLICY "select_categorias" ON public.config_categorias FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_categorias" ON public.config_categorias;
CREATE POLICY "insert_categorias" ON public.config_categorias FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_categorias" ON public.config_categorias;
CREATE POLICY "update_categorias" ON public.config_categorias FOR UPDATE
  TO authenticated USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_categorias" ON public.config_categorias;
CREATE POLICY "delete_categorias" ON public.config_categorias FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- TABLA: config_estados
-- ============================================================
CREATE TABLE IF NOT EXISTS public.config_estados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  color text DEFAULT '#2c3e50',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.config_estados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_estados" ON public.config_estados;
CREATE POLICY "select_estados" ON public.config_estados FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_estados" ON public.config_estados;
CREATE POLICY "insert_estados" ON public.config_estados FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_estados" ON public.config_estados;
CREATE POLICY "update_estados" ON public.config_estados FOR UPDATE
  TO authenticated USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_estados" ON public.config_estados;
CREATE POLICY "delete_estados" ON public.config_estados FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- TABLA: config_tipos_actuacion
-- ============================================================
CREATE TABLE IF NOT EXISTS public.config_tipos_actuacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.config_tipos_actuacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_tipos_actuacion" ON public.config_tipos_actuacion;
CREATE POLICY "select_tipos_actuacion" ON public.config_tipos_actuacion FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_tipos_actuacion" ON public.config_tipos_actuacion;
CREATE POLICY "insert_tipos_actuacion" ON public.config_tipos_actuacion FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_tipos_actuacion" ON public.config_tipos_actuacion;
CREATE POLICY "update_tipos_actuacion" ON public.config_tipos_actuacion FOR UPDATE
  TO authenticated USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_tipos_actuacion" ON public.config_tipos_actuacion;
CREATE POLICY "delete_tipos_actuacion" ON public.config_tipos_actuacion FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- DATOS INICIALES
-- ============================================================
INSERT INTO public.config_estados (nombre, descripcion, color) VALUES
  ('Iniciado', 'El expediente ha sido creado', '#1a5276'),
  ('En estudio', 'El caso está siendo analizado', '#2874a6'),
  ('En proceso', 'Actuaciones en curso', '#b9770e'),
  ('Suspendido', 'El caso está temporalmente detenido', '#7d3c98'),
  ('Finalizado', 'El expediente ha sido cerrado', '#1e8449'),
  ('Archivado', 'Expediente archivado', '#566573')
ON CONFLICT DO NOTHING;

INSERT INTO public.config_tipos_actuacion (nombre, descripcion) VALUES
  ('Demanda', 'Presentación de demanda'),
  ('Audiencia', 'Audiencia programada o realizada'),
  ('Notificación', 'Notificación oficial recibida o enviada'),
  ('Recurso', 'Interposición de recurso'),
  ('Diligencia', 'Diligencia procesal'),
  ('Consulta', 'Consulta o asesoría'),
  ('Reunión', 'Reunión con cliente o contraparte')
ON CONFLICT DO NOTHING;

INSERT INTO public.config_categorias (nombre, descripcion) VALUES
  ('Civil', 'Asuntos de derecho civil'),
  ('Penal', 'Asuntos de derecho penal'),
  ('Laboral', 'Asuntos de derecho laboral'),
  ('Familia', 'Derecho de familia'),
  ('Administrativo', 'Derecho administrativo'),
  ('Comercial', 'Derecho mercantil/comercial')
ON CONFLICT DO NOTHING;

-- ============================================================
-- REEMPLAZAR is_admin() con la implementación real
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND rol = 'admin'
  );
$$;
