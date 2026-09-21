# Turismo Cajamarca

Turismo Cajamarca es una PWA para descubrir experiencias de Cajamarca y operar un marketplace turístico con control de acceso multirol. Conecta turistas, prestadores, moderación, soporte, entidades regulatorias y administración de plataforma.

## Arquitectura

- React 19 + TypeScript 6 + Vite 8.
- Zustand para estado de sesión y contexto de plataforma.
- React Router para rutas protegidas y carga diferida de paneles.
- Tailwind CSS y componentes accesibles para la interfaz responsive.
- Supabase BaaS: Auth, PostgreSQL, RLS, triggers y RPC `SECURITY DEFINER`.
- PWA con `vite-plugin-pwa` y Workbox.

No existe backend propio. No hay pasarela de pagos integrada: los pagos son registros externos/manuales. Las recomendaciones, itinerarios y el asistente de catálogo son determinísticos; no usan Gemini, OpenAI, embeddings ni una base vectorial.

## Roles

La cuenta puede tener varios roles activos y un rol principal: Super Admin, Admin, Moderador, Prestador Turístico, Turista/Usuario, Auditor, Soporte, Analista de Datos, Afiliado, Embajador, MinCIT/FONTUR, Cámara de Comercio y Desarrollador/DevOps. `servicios_ia` es una identidad de sistema, no un rol humano.

## Capacidades principales

Autenticación y RBAC, cambio de rol y contexto de negocio; catálogo y moderación; disponibilidad, promociones y reservas; favoritos, reseñas y respuestas; equipos de prestadores; soporte, notas internas y reembolsos pendientes; auditoría; cumplimiento RNT y registro mercantil; referidos y comisiones; analítica agregada; preferencias, recomendaciones, itinerarios y asistente; notificaciones, banderas, mantenimiento, salud operativa y solicitudes de privacidad.

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

En una base nueva ejecuta solamente:

```text
sql/00_master_schema_all_in_one.sql
```

Para actualizar una base existente que ya contiene el esquema histórico, ejecuta en orden:

```text
08_refactor_rbac_multi_role.sql
09_core_tourism_marketplace.sql
10_platform_operations_growth.sql
11_experience_intelligence_engagement.sql
12_platform_functional_closure.sql
13_stabilization_data_integrity.sql
```

No ejecutes las migraciones 08–13 sobre una base nueva después del maestro. Los scripts históricos 01–07 se conservan como referencia incremental y no reconstruyen una instalación nueva.

La ejecución de QA en vivo debe hacerse únicamente en un proyecto Supabase no productivo y siguiendo [qa/RUNBOOK.md](qa/RUNBOOK.md) y [qa/LIVE_QA_MATRIX.md](qa/LIVE_QA_MATRIX.md). Si no existe un entorno QA disponible, no se deben fabricar resultados.

## Comandos

```bash
npm run dev       # servidor de desarrollo
npm run build     # compilación de producción y PWA
npm run lint      # ESLint
npm run preview   # previsualización de dist/
```

## Licencia

Proyecto privado de Turismo Cajamarca. Todos los derechos reservados.
