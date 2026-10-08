/*
# LEXACASO — Reafirmar revocación de EXECUTE en funciones internas

## Descripción
Las funciones `handle_new_user()` e `is_admin()` son internas y no deben
ser invocables vía la API REST por ningún rol. La función `set_user_role`
solo debe ser ejecutable por usuarios autenticados (su lógica interna
verifica que sea administrador).

## Cambios
- REVOKE EXECUTE de anon y authenticated en handle_new_user e is_admin.
- REVOKE EXECUTE de anon en set_user_role (authenticated puede llamarla,
  pero la función verifica internamente que el llamador sea admin).
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, text) FROM anon;
