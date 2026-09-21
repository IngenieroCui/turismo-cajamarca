# Instrucciones de desarrollo

La aplicación usa React 19, Vite, TypeScript, Zustand, Supabase Auth/PostgreSQL/RLS/RPC, React Router, Tailwind y Zod.

## Base de datos

Para una base nueva ejecuta `sql/00_master_schema_all_in_one.sql`. Para actualizar una base creada con el esquema anterior ejecuta `sql/08_refactor_rbac_multi_role.sql`.

La autorización es multi-rol: un perfil puede tener N asignaciones en `turismo_user_roles`, cada una apunta a un rol de `turismo_roles`, y los permisos se heredan desde `turismo_role_permissions`. Una asignación activa puede ser primaria. El frontend ensambla `profile.roles` y `profile.permissions`; ya no se leen `turismo_profiles.role` ni `turismo_profiles.permissions`.

Los cambios de roles, permisos y estados deben pasar por las RPC seguras. El registro público siempre crea un turista; nunca se confía en un rol enviado en metadata de Auth.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run lint
```
