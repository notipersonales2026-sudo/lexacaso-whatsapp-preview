/*
# LEXACASO — Trigger de perfil automático y asignación de admin

## Descripción
1. Crea una función trigger que inserta automáticamente un perfil en public.profiles cuando un nuevo usuario se registra en auth.users.
2. El perfil se crea con rol 'cliente' por defecto, excepto para el correo notiepersonales2026@gmail.com que recibe rol 'admin'.
3. El rol NO puede ser elegido desde el formulario de registro — se asigna exclusivamente en el servidor.

## Seguridad
- La función se ejecuta como SECURITY DEFINER (postgres) para poder escribir en public.profiles durante el signup.
- El rol se determina comparando el email con el admin autorizado, no desde user input.
*/
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre_completo, cedula, celular, direccion, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', 'Por completar'),
    COALESCE(NEW.raw_user_meta_data->>'cedula', 'Por completar'),
    COALESCE(NEW.raw_user_meta_data->>'celular', 'Por completar'),
    COALESCE(NEW.raw_user_meta_data->>'direccion', 'Por completar'),
    CASE
      WHEN NEW.email = 'notiepersonales2026@gmail.com' THEN 'admin'
      ELSE 'cliente'
    END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
