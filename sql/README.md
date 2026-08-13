# Scripts de Base de Datos PostgreSQL / Supabase - Turismo Cajamarca PWA

Esta carpeta contiene la arquitectura completa de base de datos dividida en scripts numéricos modulares para facilidades de migración, mantenimiento y despliegue en entornos de desarrollo o producción.

## Estructura de Scripts

1. **`00_master_schema_all_in_one.sql`**: Script completo unificado (All-in-One). **Opción recomendada para ejecutar en 1-solo click** dentro del SQL Editor de Supabase.
2. **`01_create_enums_and_types.sql`**: Definición de Tipos ENUM para los 15 roles del sistema, subtipos de servicios turísticos, estados de RNT y tipos de documento.
3. **`02_create_profiles_table.sql`**: Tabla base de perfiles de usuario (`public.profiles`) vinculada 1-a-1 con `auth.users(id)` y triggers de `updated_at`.
4. **`03_create_role_extension_tables.sql`**: Tablas especializadas por rol (`tourist_profiles`, `provider_profiles`, `affiliate_profiles`, `regulatory_profiles`, `audit_logs`).
5. **`04_create_auth_trigger.sql`**: Función y trigger pl/pgsql `handle_new_user()` que crea automáticamente la entrada de perfil al registrarse en Supabase Auth.
6. **`05_enable_rls_and_policies.sql`**: Habilitación de seguridad nivel de fila (Row Level Security - RLS) y políticas de privacidad.

## Instrucciones de Ejecución en Supabase

1. Abre el panel de tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard).
2. Ve a la sección **SQL Editor** en la barra lateral.
3. Copia el contenido de `00_master_schema_all_in_one.sql` (o ejecuta secuencialmente los scripts del `01` al `05`).
4. Haz click en **Run**.
