# SQL de Turismo Cajamarca

## Ejecucion

- Base nueva: ejecutar `00_master_schema_all_in_one.sql`.
- Base existente: ejecutar `08_refactor_rbac_multi_role.sql`, `09_core_tourism_marketplace.sql`, `10_platform_operations_growth.sql`, `11_experience_intelligence_engagement.sql`, `12_platform_functional_closure.sql`, `13_stabilization_data_integrity.sql` y `14_default_user_role_and_role_switching.sql`, en ese orden.
- `00_master_schema_all_in_one.sql` incorpora las fases 11, 12 y 13; no ejecutes esas migraciones dos veces sobre una base nueva.

Los scripts 01-07 se conservan como historial incremental; no deben usarse para reconstruir una base nueva.

La migración 13 es la fase final de estabilización y corrige integridad de datos, ciclo de comisiones, scoping de colaboradores, banderas, auditoría, salud de plataforma y privilegios de privacidad.

La migración 14 cambia el alta de nuevas cuentas al rol base `usuario`, evita crear extensiones de turista durante el registro y centraliza la inicialización de extensiones al asignar roles. Las cuentas existentes conservan sus asignaciones.

## Autorizacion

`turismo_profiles` contiene identidad y datos personales. La asignacion es `turismo_profiles (1) -> turismo_user_roles (N) -> turismo_roles (1)`. Los roles heredan permisos mediante `turismo_role_permissions` y `turismo_permissions`. Cada usuario puede tener varios roles activos y una sola asignacion primaria activa.

Las mutaciones privilegiadas se realizan mediante RPC `SECURITY DEFINER` y las lecturas se protegen con RLS. El perfil propio se actualiza mediante `turismo_update_own_profile`.

## Marketplace turistico

`09_core_tourism_marketplace.sql` crea catalogo, reservas, favoritos y resenas, junto con RPC, RLS y datos editoriales iniciales. La migracion es transaccional.

## Operaciones, cumplimiento, crecimiento y BI

`10_platform_operations_growth.sql` agrega soporte y reembolsos pendientes de procesamiento financiero, auditoria e informes append-only, cumplimiento RNT/Registro Mercantil, referidos y comisiones, y analitica BI agregada. No ejecuta pagos ni integra servicios externos.

`11_experience_intelligence_engagement.sql` agrega disponibilidad explícita, promociones, preferencias, recomendaciones determinísticas, itinerarios, asistente de catálogo, métricas reales y notificaciones. Tiene un único bloque transaccional (`BEGIN`/`COMMIT`) y reemplaza la RPC de reservas conservando la atribución de referidos.

`12_platform_functional_closure.sql` agrega configuración y banderas server-side, equipos internos de prestadores, pagos manuales/externos, exportación y solicitudes de privacidad, salud operativa y marcadores de versión de esquema. Es transaccional con un único bloque `BEGIN`/`COMMIT` y no integra pasarelas de pago.
