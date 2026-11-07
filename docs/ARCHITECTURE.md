# Arquitectura de Turismo Cajamarca

[Presentación](../README.md) · [Procedencia](../PROVENANCE.md). Fuente: `main`, base `39e3aa6`, servicios de `src/services`, estado de sesión y migraciones `sql/`.

## Componentes

```text
PWA React 19 / TypeScript 6 / Vite 8
  ├─ React Router → paneles y rutas protegidas
  ├─ Zustand → sesión, rol y contexto de negocio
  └─ Servicios de frontend → Supabase Auth + PostgreSQL/RLS + RPC
```

No existe un backend propio separado. Supabase aporta Auth y datos; las mutaciones privilegiadas se concentran en RPC `SECURITY DEFINER` y las lecturas se protegen con RLS. La UI utiliza Tailwind; `vite-plugin-pwa` y Workbox aportan la capa PWA, sin convertir los procesos de negocio remotos en operaciones offline.

## Flujo de datos y acceso

Auth representa la cuenta personal; `turismo_profiles` registra su perfil y `turismo_user_roles` enlaza una o más capacidades. El registro público asigna Turista; el rol principal determina el dashboard inicial y el selector cambia el panel actual. Los permisos se relacionan mediante roles y permisos en tablas dedicadas. Las comprobaciones de rutas complementan la autorización de base, no la sustituyen.

El turista consulta catálogo, disponibilidad/promociones y crea reservas. Prestadores operan su negocio y equipos; los demás roles cubren moderación, soporte, regulación, administración y crecimiento según sus permisos. Los servicios de catálogo, marketplace, disponibilidad, pagos, auditoría y configuración encapsulan las llamadas a Supabase.

Las recomendaciones, itinerarios y asistente son determinísticos; no se documentan como inferencia generativa. Los pagos representan registros externos/manuales, sin una pasarela integrada acreditada.

## Demo y límites de aislamiento

La demostración utiliza **26 experiencias**, cuentas ficticias y un recorrido de reserva verificado en la ejecución previa comunicada por el propietario. Esa verificación es antecedente del proyecto; no se repitió en este sprint. El tamaño es una fotografía de la demo, no una garantía de cantidad constante en todas las instalaciones.

`scripts/seed-demo-accounts.mjs` prepara cuentas/datos con credenciales privadas suministradas al proceso. No deben publicarse contraseñas ni la service key. El entorno comparte proyecto Supabase con Komerizo por decisión del propietario y utiliza tablas con prefijo `turismo_`: no equivale a aislamiento físico completo.

Las migraciones 18 y 20 aíslan el trigger de Auth mediante un marcador de aplicación; el frontend envía `application=turismo-cajamarca`. Ese marcador identifica la aplicación y no otorga roles administrativos. No se ejecutaron seeders, migraciones ni escrituras remotas aquí.

## Decisiones y cambios comprobables

- BaaS evita mantener una API propia; RLS/RPC concentra permisos que no pueden depender solamente de la UI.
- El modelo multirol separa persona de capacidad y contexto de negocio.
- `4b6376c` registra seeder y aislamiento de trigger, con autor `unknown`; no se reasigna ese commit.
- `2acd3b0` (Juan David Reyes Cure) alinea el seeder con restricciones del catálogo; `8a52496` recupera cargas diferidas obsoletas; `39e3aa6` conserva fechas de reserva sin desplazamiento por zona horaria.
- Se conserva el README actualizado y se añade esta explicación de arquitectura. La atribución original de jnaveros40 y Andrecodev permanece en Git y `PROVENANCE.md`.

## Configuración y operación

`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` configuran el cliente. La clave anon es pública y su seguridad depende de permisos/RLS; no sustituye una service key. Las credenciales privilegiadas solo corresponden a procesos operativos autorizados, nunca al bundle ni a archivos versionados.

Para una base nueva, el proyecto documenta el maestro `sql/00_master_schema_all_in_one.sql`. Para una base existente, conserva las migraciones incrementales y la [guía SQL](../sql/README.md). El README identifica además las migraciones específicas 18/20 del entorno compartido; no deben extrapolarse ni ejecutarse indiscriminadamente. Las migraciones históricas, la documentación SQL y los runbooks QA se conservan intactos.

## Dependencias, riesgos y mejoras

Supabase es necesario para sesión, catálogo y reservas. El aislamiento lógico compartido, los privilegios de funciones `SECURITY DEFINER`, los triggers y las políticas requieren auditoría del entorno antes de uso público. Una revisión estática no demuestra la configuración desplegada ni la vigencia de credenciales. La publicación del código requiere además revisión de derechos de la copia, imágenes y datos.

Las mejoras posibles incluyen un entorno QA independiente, verificación continua de permisos y recorridos, observabilidad y revisión de carga/PWA. No se ejecutaron pruebas, builds ni operaciones de base en este sprint; la evidencia anterior no se presenta como resultado nuevo.
