# Instrucciones de desarrollo

La aplicación usa React 19, Vite, TypeScript, Zustand, Supabase Auth/PostgreSQL/RLS/RPC, React Router, Tailwind y Zod.

## Base de datos

Para una base nueva ejecuta únicamente `sql/00_master_schema_all_in_one.sql`. Para actualizar una base existente, ejecuta las migraciones en orden: 08, 09, 10, 11, 12, 13, 14, 15 y 16. La lista completa está en [sql/README.md](../sql/README.md).

Una cuenta es la persona: la representa Supabase Auth junto con `turismo_profiles`. Los roles son capacidades o paneles y se conectan mediante `turismo_user_roles`; una cuenta puede tener varios roles. No se lee `turismo_profiles.role` ni se guardan permisos directamente en el perfil.

El registro público crea una cuenta Turista y el trigger de Auth asigna el rol Turista e inicializa su perfil turístico. El formulario no elige ni envía un rol. Las cuentas pueden recibir roles adicionales mediante las RPC seguras. `usuario` es un rol legado de compatibilidad, sin permisos y sin nuevas asignaciones.

Los roles de negocio no se mezclan con Desarrollador/DevOps. La identidad de sistema `servicios_ia` permanece separada de las cuentas humanas. Turista y Afiliado/Embajador pueden coexistir; MinCIT/FONTUR y Cámara de Comercio siguen siendo incompatibles.

Afiliado y Embajador requieren una asignación activa de Turista; son capacidades adicionales de referidos/comisiones y no duplican los permisos de consumidor. El alta pública siempre crea Turista. `usuario` es solo compatibilidad histórica y no es una persona operativa. Migración 16 aún no se ha aplicado a la base en vivo; las asignaciones históricas que mezclen sistema y persona se dejan intactas para revisión explícita de Super Admin.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run lint
```
