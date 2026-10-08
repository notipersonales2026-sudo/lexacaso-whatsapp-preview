/*
# LEXACASO — Revocar EXECUTE público en funciones SECURITY DEFINER

## Descripción
Revoca el permiso EXECUTE de las funciones `handle_new_user()` e `is_admin()` 
para los roles `anon` y `authenticated`. Estas funciones son internas:
- `handle_new_user()` es un trigger que se ejecuta automáticamente al crear un usuario.
- `is_admin()` se usa internamente por las políticas RLS.

Ninguna debe ser invocable directamente vía la API REST.

## Seguridad
- REVOKE EXECUTE de anon y authenticated en ambas funciones.
*/
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated;
