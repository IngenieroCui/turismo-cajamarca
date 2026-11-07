# Turismo Cajamarca

Turismo Cajamarca es una PWA para descubrir experiencias de Cajamarca y operar un marketplace turístico con control de acceso multirol. Conecta turistas, prestadores, moderación, soporte, entidades regulatorias y administración de la plataforma.

## Arquitectura

- React 19, TypeScript 6 y Vite 8.
- Zustand para el estado de sesión y contexto de plataforma.
- React Router para rutas protegidas y carga diferida de paneles.
- Tailwind CSS y componentes accesibles para la interfaz responsive.
- Supabase BaaS: Auth, PostgreSQL, RLS, triggers y RPC `SECURITY DEFINER`.
- PWA con `vite-plugin-pwa` y Workbox.

No existe backend propio ni pasarela de pagos integrada: los pagos son registros externos/manuales. Las recomendaciones, itinerarios y el asistente de catálogo son determinísticos.

## Cuentas y roles

Una cuenta representa a una persona; las asignaciones de roles representan sus capacidades y paneles. Cada persona puede tener varios roles activos y una asignación principal para determinar el panel inicial.

El registro público crea una cuenta con el rol Turista, que da acceso a la experiencia de consumidor en `/turista`. Administradores pueden asignar otros roles cuando corresponda, por ejemplo Turista + Prestador o Turista + Afiliado. La cuenta y el rol son conceptos distintos.

`usuario` se conserva únicamente como rol legado para compatibilidad histórica. No es un rol base, no se asigna a nuevas cuentas y no tiene permisos operativos. `servicios_ia` es una identidad de sistema y no un rol humano.

Afiliado y Embajador son roles de crecimiento aditivos: requieren que la cuenta tenga también Turista y no duplican sus permisos de consumidor. Desarrollador/DevOps se mantiene separado de los roles de negocio. Las identidades de sistema y las cuentas humanas permanecen separadas; cualquier asignación mixta histórica se revisa y corrige explícitamente por Super Admin.

## Capacidades principales

Autenticación y RBAC, cambio de rol y contexto de negocio; catálogo y moderación; disponibilidad, promociones y reservas; favoritos, reseñas y respuestas; equipos de prestadores; soporte; auditoría; cumplimiento RNT y registro mercantil; referidos y comisiones; analítica agregada; preferencias, recomendaciones, itinerarios y asistente; notificaciones, banderas, salud operativa y solicitudes de privacidad.

## Desarrollo local

Requisitos: Node.js 18+ y npm 9+.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Configura en `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_APP_NAME=Turismo Cajamarca
VITE_APP_VERSION=1.0.0
```

No guardes claves service-role, contraseñas, tokens ni otros secretos en el repositorio. El cliente utiliza únicamente la clave pública anon de Supabase.

## Base de datos

En una base nueva ejecuta solamente `sql/00_master_schema_all_in_one.sql`.

Para actualizar una base existente que ya contiene el esquema histórico, ejecuta estas migraciones en orden:

```text
08_refactor_rbac_multi_role.sql
09_core_tourism_marketplace.sql
10_platform_operations_growth.sql
11_experience_intelligence_engagement.sql
12_platform_functional_closure.sql
13_stabilization_data_integrity.sql
14_default_user_role_and_role_switching.sql
15_final_account_rbac_hardening.sql
16_correct_account_role_semantics.sql
17_secure_platform_settings_and_schema_version.sql
```

En la base compartida `komerizo-demo`, las migraciones versionadas 18 y 20 aíslan el trigger de Auth y exigen el marcador explícito de Turismo; se aplican solo a este proyecto. La migración 20 es idempotente y conserva las cuentas y registros existentes.

Las migraciones 08–17 son históricas e inmutables y están aplicadas en `komerizo-demo`. La migración 16 corrige el modelo cuenta/rol y restablece el alta pública como Turista; la 17 protege la configuración y versión del esquema. No ejecutes migraciones incrementales sobre una base nueva después del maestro. Los scripts históricos 01–07 se conservan como referencia y no reconstruyen una instalación nueva.

La QA en vivo debe hacerse únicamente en un proyecto Supabase no productivo y siguiendo [qa/RUNBOOK.md](qa/RUNBOOK.md) y [qa/LIVE_QA_MATRIX.md](qa/LIVE_QA_MATRIX.md). No fabriques resultados si no existe un entorno QA disponible.

## Comandos

```bash
npm run dev       # servidor de desarrollo
npm run build     # compilación de producción y PWA
npm run lint      # ESLint
npm run preview   # previsualización de dist/
npm run demo:seed # siembra cuentas y datos ficticios con una service key privada
```

## Demostración

La versión desplegada se mantiene en [turismo-cajamarca-beta.vercel.app](https://turismo-cajamarca-beta.vercel.app). El seeder idempotente `scripts/seed-demo-accounts.mjs` crea o reutiliza las cuentas `turista.demo.cajamarca@gmail.com` (Turista), `prestador.demo.cajamarca@gmail.com` (Prestador Turístico) y `moderador.demo.cajamarca@gmail.com` (Moderador), añade un proveedor y una experiencia ficticia de Anaime y conserva el catálogo histórico de 25 elementos. Ejecuta `npm run demo:seed` con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` definidos únicamente en el entorno privado; las contraseñas pueden pasarse mediante `DEMO_TURISTA_PASSWORD`, `DEMO_PRESTADOR_PASSWORD` y `DEMO_MODERADOR_PASSWORD`. Si se generan, quedan en `demo-credentials.local`, ignorado por Git.

La migración 20 evita que el trigger compartido de `auth.users` cree perfiles de Turismo para inscripciones de otras aplicaciones. El frontend envía el marcador `application=turismo-cajamarca`; ningún rol administrativo se deriva de ese marcador. El seeder usa la service key solo en ejecución operativa y no la incluye en el bundle ni en el repositorio.

## Licencia

Proyecto privado de Turismo Cajamarca. Todos los derechos reservados.
