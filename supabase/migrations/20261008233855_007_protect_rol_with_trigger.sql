/*
# LEXACASO — Proteger columna rol mediante trigger

## Descripción
Supabase reasigna automáticamente los privilegios de columna a los roles anon y authenticated,
por lo que la revocación anterior (REVOKE UPDATE (rol)) no persistió.

Esta migración crea un trigger BEFORE UPDATE sobre `profiles` que impide que cualquier
usuario que no sea administrador modifique la columna `rol`. El administrador puede seguir
cambiando roles a través de la función `set_user_role`.

## Seguridad
- Un cliente NO puede auto-elevar su rol cambiando el valor de `rol` en su propio perfil.
- Un cliente NO puede bajarse del rol admin si lo tuviera (no aplica actualmente).
- El administrador SÍ puede cambiar roles mediante `set_user_role` (que usa SECURITY DEFINER
  y por tanto ejecuta como superuser, saltándose el trigger).
- El cambio de rol queda registrado en la bitácora.
*/

CREATE OR REPLACE FUNCTION public.protect_rol_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si el rol está cambiando y el usuario actual no es admin, bloquear
  IF NEW.rol IS DISTINCT FROM OLD.rol AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'No tiene permisos para cambiar el rol. Esta acción está reservada al administrador.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_rol ON profiles;
CREATE TRIGGER trg_protect_rol
  BEFORE UPDATE OF rol ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_rol_column();
