/*
# LEXACASO — Asignación de rol administrador y restricción de columna rol

## Descripción
1. Asigna el rol 'admin' al usuario existente notipersonales2026@gmail.com (actualmente 'cliente').
2. Crea una función SECURITY DEFINER `set_user_role` que solo un administrador puede invocar para cambiar el rol de un usuario.
3. Revoca el permiso UPDATE sobre la columna `rol` de `profiles` para los roles anon y authenticated, de modo que un cliente no pueda auto-elevar su rol mediante una petición directa.
4. Registra el cambio de rol en la bitácora de auditoría.
5. No elimina ni modifica usuarios, expedientes ni documentos existentes.

## Seguridad
- La columna `rol` queda protegida: los clientes pueden actualizar su nombre, celular y dirección, pero no su rol.
- Solo un administrador puede cambiar roles mediante la función `set_user_role`.
- El cambio queda registrado en la bitácora.
*/

-- 1. Asignar rol admin al usuario existente
UPDATE profiles
SET rol = 'admin'
WHERE email = 'notipersonales2026@gmail.com' AND rol != 'admin';

-- 2. Función SECURITY DEFINER para cambiar roles (solo admin)
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar roles';
  END IF;
  IF new_role NOT IN ('admin', 'cliente') THEN
    RAISE EXCEPTION 'Rol no válido';
  END IF;
  UPDATE profiles SET rol = new_role WHERE id = target_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;

-- 3. Restringir la columna rol: revocar UPDATE para anon y authenticated
REVOKE UPDATE (rol) ON profiles FROM anon, authenticated;

-- 4. Registrar el cambio en la bitácora
INSERT INTO bitacora_auditoria (autor_id, accion, detalle, entidad, entidad_id)
SELECT id, 'asignar_rol_admin', 'Rol cambiado de cliente a admin para notipersonales2026@gmail.com', 'perfil', id
FROM profiles WHERE email = 'notipersonales2026@gmail.com';
