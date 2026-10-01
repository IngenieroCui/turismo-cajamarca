# SQL de Turismo Cajamarca

## Ejecución

- Base nueva: ejecutar únicamente `00_master_schema_all_in_one.sql`.
- Base existente: aplicar, en orden, las migraciones 08, 09, 10, 11, 12, 13, 14, 15 y 16.
- El maestro contiene el estado final. No apliques las migraciones incrementales sobre una instalación nueva después del maestro.
- Las migraciones históricas 08–15 permanecen inmutables.

La secuencia existente termina con `16_correct_account_role_semantics.sql`, que corrige la separación entre cuenta y rol. Una cuenta de Auth y su fila en `turismo_profiles` representan a la persona; `turismo_user_roles` conecta esa cuenta con una o más capacidades/paneles.

El registro público asigna el rol Turista y crea `turismo_tourist_profiles`. La metadata pública de Auth no decide roles. Administradores pueden asignar roles adicionales respetando las reglas RBAC. `usuario` se mantiene como rol legado de compatibilidad, sin permisos operativos y sin nuevas asignaciones.

Afiliado y Embajador son roles de crecimiento aditivos: cada asignación requiere Turista activo, y sus permisos solo cubren referidos y comisiones. Turista conserva las capacidades de consumidor. Desarrollador/DevOps no puede coexistir con roles de negocio. Las identidades de sistema se mantienen separadas de las personas; los estados mixtos heredados se registran sin desactivar roles automáticamente y requieren limpieza explícita de Super Admin.

La migración 16 aún no se ha aplicado a la base de datos en vivo. Las correcciones pendientes se realizan directamente en esa migración y en el maestro; no se debe crear una migración 17.

## Autorización

Los roles heredan permisos mediante `turismo_role_permissions` y `turismo_permissions`. Una cuenta puede tener varios roles activos y una sola asignación primaria con panel activo. La asignación primaria determina el dashboard inicial; RoleSwitcher cambia el panel actual sin modificar esa asignación.

Las mutaciones privilegiadas se realizan mediante RPC `SECURITY DEFINER`; las lecturas se protegen con RLS. El perfil propio se actualiza mediante `turismo_update_own_profile`. Las RPC y rutas turísticas requieren el rol Turista real.

## Migraciones históricas

- 08 introduce la arquitectura RBAC multirol.
- 09 crea catálogo, reservas, favoritos y reseñas.
- 10 agrega operaciones de plataforma, cumplimiento, referidos y BI.
- 11 agrega disponibilidad, promociones, preferencias, itinerarios, asistente y notificaciones.
- 12 cierra configuración de plataforma, equipos, pagos externos y privacidad.
- 13 estabiliza integridad de datos, auditoría y privilegios.
- 14–15 contienen comportamiento histórico del alta y endurecimiento RBAC; se conservan sin cambios.
- 16 restaura el alta Turista, depura `usuario`, reconcilia cuentas heredadas sin destruir asignaciones mixtas, y mantiene los controles RBAC y de auditoría.
