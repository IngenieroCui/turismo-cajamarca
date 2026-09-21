# Turismo Cajamarca — Matriz de QA en vivo

QA-2.1 · Preflight final de frontend

Este documento define la validación manual contra un proyecto Supabase **no productivo**. Es una matriz de ejecución, no contiene datos de producción, contraseñas ni correos reales. Cada cuenta debe crearse con el correo placeholder indicado y una contraseña temporal gestionada fuera de este repositorio.

## Preparación y cuentas

Usar un proyecto QA vacío o restaurable y las migraciones indicadas en [RUNBOOK.md](./RUNBOOK.md). Crear también dos negocios de prueba: `QA-BUSINESS-A` y `QA-BUSINESS-B`, con un catálogo y reservas controladas. Mantener IDs reales de QA en la evidencia, nunca credenciales.

| ID | Cuenta placeholder | Persona | Rol(es) requerido(s) | Dashboard esperado |
| --- | --- | --- | --- | --- |
| P01 | `qa-tourist@example.test` | Tourist | `turista` | `/turista` |
| P02 | `qa-legacy-usuario@example.test` | Legacy Usuario | `usuario` | `/usuario` y acceso compatible a `/turista` |
| P03 | `qa-provider-owner-a@example.test` | Provider Owner A | `prestador_turistico`; propietario de QA-BUSINESS-A | `/prestador_turistico` |
| P04 | `qa-provider-owner-b@example.test` | Provider Owner B | `prestador_turistico`; propietario de QA-BUSINESS-B | `/prestador_turistico` |
| P05 | `qa-provider-catalog@example.test` | Provider Collaborator — Catalog only | membresía activa en QA-BUSINESS-A, `colaborador`, `catalog` | `/prestador_turistico` con contexto A |
| P06 | `qa-provider-reservations@example.test` | Provider Collaborator — Reservations only | membresía activa en QA-BUSINESS-A, `colaborador`, `reservations` | `/prestador_turistico` con contexto A |
| P07 | `qa-provider-finance@example.test` | Provider Collaborator — Finance only | membresía activa en QA-BUSINESS-A, `colaborador`, `finance` | `/prestador_turistico` con contexto A |
| P08 | `qa-provider-manager@example.test` | Provider Manager | membresía activa en QA-BUSINESS-A, `manager` | `/prestador_turistico` con contexto A |
| P09 | `qa-moderator@example.test` | Moderator | `moderador` | `/moderador` |
| P10 | `qa-support@example.test` | Support | `soporte` + `support:tickets_manage` | `/soporte` |
| P11 | `qa-auditor@example.test` | Auditor | `auditor` | `/auditor` |
| P12 | `qa-analyst@example.test` | Analyst | `analista_datos` + `bi:analytics_read` | `/analista_datos` |
| P13 | `qa-affiliate@example.test` | Affiliate | `afiliado` | `/afiliado` |
| P14 | `qa-ambassador@example.test` | Ambassador | `embajador` | `/embajador` |
| P15 | `qa-mincit@example.test` | MinCIT / FONTUR | `funcionario_mincit` | `/funcionario_mincit` |
| P16 | `qa-chamber@example.test` | Chamber of Commerce | `camara_comercio` | `/camara_comercio` |
| P17 | `qa-admin@example.test` | Admin | `admin` | `/admin` |
| P18 | `qa-super-admin@example.test` | Super Admin | `super_admin` | `/super_admin` |
| P19 | `qa-devops@example.test` | DevOps | `desarrollador` + `devops:infra_manage` | `/desarrollador` |

Para los colaboradores, la membresía de proveedor es la fuente de permisos operativos. Si el flujo de la aplicación requiere un rol global adicional, asignarlo mediante la aplicación y registrar el resultado; no editar la base directamente para simular la funcionalidad que se está probando.

## Contrato por persona

| Persona | Permisos clave | Operaciones que MUST succeed | Operaciones que MUST fail | Cross-role security checks |
| --- | --- | --- | --- | --- |
| Tourist | catálogo publicado, favoritos, reservas propias, pagos declarados, reseñas, soporte, preferencias | registrarse, confirmar correo, iniciar sesión, consultar catálogo, guardar favorito, reservar, declarar pago, reseñar, crear ticket, asistente, exportar datos y solicitar eliminación | crear o modificar catálogo; moderar; leer reserva o notificaciones de otro turista; administrar pagos de proveedor | cambiar a rutas de proveedor, admin, soporte o moderación; alterar IDs en RPC |
| Legacy Usuario | permisos del usuario legado y lectura turística compatible | iniciar sesión, llegar al dashboard por defecto y usar el flujo turístico permitido | acciones de proveedor, moderación, soporte interno o RBAC | confirmar que el acceso legado no amplía permisos de turista autenticado |
| Provider Owner A | catálogo, disponibilidad, promociones, reservas, respuestas, equipo, finanzas, soporte y cumplimiento de su negocio | gestionar perfil/negocio A, CRUD de catálogo, enviar moderación, disponibilidad, promociones, reservas, reseñas, colaboradores, pagos y soporte | moderar directamente su propio catálogo; cambiar verificación RNT; acceder al negocio B; otorgarse rol global | usar IDs de B en rutas, RPC y contexto; cambiar de usuario y comprobar RLS |
| Provider Owner B | mismos permisos, solo sobre B | repetir flujos del owner sobre B | leer o mutar A; administrar RBAC global | probar que un ID de A no aparece aunque sea conocido |
| Catalog only | `catalog` | leer y crear/editar/enviar catálogo según el flujo autorizado | reservas, pagos, finanzas, equipo y promociones | abrir directamente rutas y RPC de A/B; solo A debe ser visible |
| Reservations only | `reservations` | consultar y actualizar operaciones de reservas de A | editar catálogo, promociones, finanzas y equipo | reserva de B, pago de B y mutación de catálogo por RPC |
| Finance only | `finance` | consultar y revisar pagos de A | cambiar estado de reserva, catálogo y promociones | crear/revisar un pago de otra reserva o de B |
| Manager | semántica actual de `turismo_can_manage_provider`; permisos operativos de manager y finanzas solo si están concedidos | cambiar contexto, operar las capacidades que la función autoriza y administrar el contexto permitido | acciones no cubiertas por la función o fuera del negocio | comprobar exactamente cada permiso con UI y RPC, y que logout limpie el contexto |
| Moderator | `content:moderate` | ver pendientes, aprobar/rechazar catálogo y revisar pendientes | cambiar RNT, registro comercial, usuarios protegidos o pagos | owner no puede aprobar su propio catálogo; moderator no obtiene administración global |
| Support | `support:tickets_manage` | cola de tickets, nota interna, resolución y solicitud de reembolso dentro del límite | editar roles, catálogo, RNT o logs | requester no ve notas internas; ticket de otro ámbito se filtra por RLS |
| Auditor | lectura de logs y creación de informes | leer logs y crear informe | modificar/borrar log o actuar como moderator | intentar insert/update directo de auditoría y acceder a PII cruda |
| Analyst | `bi:analytics_read`, exportación agregada | panel agregado y CSV | leer perfiles, correos, reservas identificables o logs protegidos | comprobar que el CSV no contiene PII cruda |
| Affiliate | referrals y comisiones de afiliado | referral válido, visita única, atribución y comisión | manipular comisión o atribuir una reserva ajena directamente | revocación del rol invalida nuevos referrals |
| Ambassador | referrals y comisiones de ambassador | mismos hitos con identidad ambassador | actuar como affiliate ajeno, modificar pagos o usuarios | revocación invalida atribución nueva |
| MinCIT / FONTUR | decisión RNT únicamente | revisar y decidir RNT | decidir registro mercantil o catálogo | Chamber no puede decidir RNT; provider ve el estado resultante |
| Chamber | decisión de registro mercantil únicamente | revisar y decidir registro mercantil | decidir RNT o moderación | MinCIT no puede decidir registro comercial |
| Admin | usuarios/roles/permisos asignables, moderación y soporte permitido | gestionar usuarios normales, roles normales, permisos permitidos, moderación y soporte | ver usuarios protegidos cuando RLS lo impide; asignar protected roles; modificar Super Admin; asignar Servicios IA; cambiar settings protegidos | probar cada RPC como Admin autenticado, no solo ocultamiento de UI |
| Super Admin | roles protegidos, configuración de plataforma, privacidad, salud y perfiles regulatorios | gestionar roles protegidos, maintenance mode, feature flags, privacy review, system health y configuración regulatoria | cualquier acción bloqueada por integridad o fuera de la política | refrescar UI sin reload; comprobar que no hay bypass por cliente |
| DevOps | `devops:infra_manage` | consultar salud técnica y métricas permitidas | cambiar RBAC, moderar o decidir cumplimiento | no expone secretos ni datos personales |

## 1. Tourist y Legacy Usuario

Ejecutar con P01 y repetir el acceso compatible con P02:

- Signup, ruta de confirmación de correo, login, logout y refresh de sesión.
- Guardar preferencias; verificar que se conservan después de cerrar sesión y volver a entrar.
- Leer catálogo publicado, abrir detalle, filtrar por categoría y consultar disponibilidad.
- Crear/eliminar favorito; verificar que otro turista no lo puede ver.
- Crear reserva propia, revisar estados, cancelación permitida y promoción aplicada.
- Declarar pago externo; verificar que el proveedor puede verlo solo en su negocio.
- Crear reseña solo para una reserva completada y comprobar respuesta del proveedor.
- Crear ticket de soporte, consultar conversación y usar el asistente/itinerario.
- Abrir notificaciones, marcar una y todas como leídas, y comprobar retorno de foco al cerrar con Escape.
- Solicitar exportación de datos personales y solicitud de eliminación; verificar estado y auditoría.

Debe fallar, tanto en UI como por RPC o REST autenticado, lo siguiente: crear catálogo; moderar; leer la reserva de otro turista; leer las notificaciones de otro usuario; administrar pagos de proveedor.

## 2. Provider Owner

Ejecutar la batería con P03 sobre A y con P04 sobre B:

- Completar perfil y datos del negocio; verificar display de cumplimiento.
- Crear, editar, archivar y enviar una oferta a moderación; gestionar disponibilidad y promociones.
- Consultar, confirmar/rechazar y completar las reservas propias permitidas; responder reseñas.
- Agregar, editar, desactivar y eliminar colaboradores desde el flujo de equipo.
- Consultar/revisar pagos externos de su negocio y crear tickets asociados.
- Intentar moderar directamente su catálogo: debe exigir el flujo de Moderator.
- Intentar cambiar verificación RNT: debe fallar y quedar reservado a MinCIT.
- Cambiar `provider_context_id` a B: debe fallar para Owner A y viceversa.
- Intentar asignar un rol global o permiso protegido a sí mismo: debe fallar.

## 3. Colaboradores y contextos

Usar el mismo conjunto de ofertas, reservas y pagos de QA-BUSINESS-A para evitar falsos positivos.

### Catalog only (P05)

Debe funcionar catálogo autorizado (lectura, alta, edición y envío según estado). Deben fallar reservas, disponibilidad fuera de lo concedido, promociones, pagos/finance, equipo y soporte de proveedor.

### Reservations only (P06)

Debe funcionar lectura y operaciones de reserva autorizadas. Deben fallar edición/envío de catálogo, promociones, pagos y gestión del equipo.

### Finance only (P07)

Debe funcionar lectura y revisión de pagos. Deben fallar cambios de estado de reservas, catálogo, promociones y equipo.

### Manager (P08)

Verificar literalmente la semántica vigente de `turismo_can_manage_provider(provider_id, permission)`: el manager recibe las capacidades operativas de manager y solo puede usar finanzas si `finance` está presente en sus permisos. Comprobar cada permiso en UI y llamada directa. Cambiar entre A y B, intentar B, cerrar sesión, iniciar de nuevo y confirmar que el contexto anterior se limpió.

En todos los perfiles: la UI puede ocultar acciones, pero la prueba PASS requiere que la RPC o política del servidor también rechace la acción no permitida.

## 4. Admin

Con P17 verificar usuarios normales, roles normales, permisos asignables, moderación y soporte. Confirmar que RLS impide ver cuentas protegidas; no se pueden asignar roles protegidos, modificar Super Admin, asignar `servicios_ia` ni cambiar settings protegidos. Repetir los intentos usando llamadas directas autenticadas y documentar el error de Supabase.

## 5. Super Admin

Con P18 verificar roles protegidos, configuración de plataforma, privacidad, salud y configuración regulatoria. Activar y desactivar `maintenance_mode` y cada feature flag; confirmar que la UI se actualiza sin reload y que el RPC/server impide la operación deshabilitada. Validar que los cambios sobreviven refresh de página y se reflejan en el banner o controles correspondientes.

## 6. Roles operativos

- **Moderator (P09):** cola de catálogo pendiente, aprobar/rechazar, cola de reseñas pendientes y motivo obligatorio cuando corresponda.
- **Support (P10):** cola de tickets, respuesta pública, nota interna, resolución y límite de solicitud de reembolso. El requester nunca debe ver notas internas.
- **Auditor (P11):** lectura paginada de logs y creación de informe; update/delete/insert manual de logs debe fallar.
- **Analyst (P12):** agregados por periodo y CSV; revisar el archivo para confirmar ausencia de correos, nombres, IDs sensibles o filas crudas.
- **DevOps (P19):** estado técnico, hora de base de datos y métricas permitidas; no debe ver secretos ni adquirir permisos de otros roles.

## 7. Regulatory

Con P15 revisar únicamente RNT y con P16 únicamente registro mercantil. Intentar en cada sesión la decisión del dominio contrario: debe fallar por UI, RPC y RLS. Confirmar que el provider owner ve el estado resultante en su panel y que la decisión queda auditada.

## 8. Referrals

Con P13 y P14 probar referral válido, visita única, atribución a reserva, comisión pendiente, comisión ganada y anulación al cancelar. Repetir una visita y una reserva para verificar idempotencia/únicidad. Revocar el rol y confirmar que no se aceptan nuevos referrals ni atribuciones con ese actor; registrar qué ocurre con comisiones ya ganadas.

## 9. Feature flags

Probar cada flag en estado activo e inactivo:

| Flag | Frontend esperado cuando está off | Prueba directa obligatoria |
| --- | --- | --- |
| `maintenance_mode` | banner/bloqueo según política de mantenimiento | ruta/RPC no permite mutaciones no autorizadas |
| `reservations_enabled` | botones y flujo de reserva deshabilitados | creación/confirmación de reserva falla en servidor |
| `reviews_enabled` | formulario de reseña oculto/deshabilitado | creación de reseña falla en RPC |
| `promotions_enabled` | gestión y aplicación de promociones no disponible | create/update/apply de promoción falla |
| `referrals_enabled` | tracker y enlaces no operativos | visita/atribución RPC falla |
| `assistant_enabled` | Asistente no aparece en navegación ni acción | generación/guardado de itinerario falla |
| `support_enabled` | creación de tickets no disponible | creación de ticket falla en servidor |

La ocultación frontend nunca cuenta como PASS por sí sola. Registrar flag, actor, ruta, RPC, respuesta y evidencia.

## 10. Multi-role

Crear, si la política lo admite, estos casos:

- Tourist + Provider: RoleSwitcher, unión de permisos, dashboard activo, consultas acotadas por contexto y ausencia de fugas.
- Tourist + Affiliate: dashboard activo según selector, turismo más referral, sin permisos provider.
- Admin + otro rol permitido: unión exacta definida por política, sin convertir Admin en Super Admin.

Para cada caso cambiar el rol activo, refrescar, navegar directamente y cerrar sesión. Confirmar que el nuevo usuario no hereda contexto, caché, notificaciones, datos de reserva ni `provider_context_id` del usuario anterior.

## 11. Security negative tests directos

Ejecutar como el actor indicado usando Supabase autenticado y registrar rechazo esperado:

1. Tourist intenta autoasignarse un rol.
2. Tourist intenta verificar su propio RNT.
3. Tourist intenta editar permisos de un rol.
4. Admin intenta leer usuarios protegidos.
5. Cualquier usuario intenta modificar el perfil de otra persona.
6. Tourist/provider intenta crear pago para otra reserva.
7. Provider intenta revisar una reserva incompleta o que no pertenece a su negocio.
8. Provider A intenta administrar reserva de Provider B.
9. Requester intenta leer notas internas de soporte.
10. Cualquier cliente intenta escribir directamente en audit logs.
11. Cualquier cliente intenta crear notificaciones directamente.

Cada rechazo debe venir del servidor/RLS/RPC, no solo de un `disabled` o una ruta oculta. Adjuntar SQL/RPC utilizado sin incluir tokens.

## Criterio de salida

Una persona queda PASS solo cuando sus operaciones positivas, negativas, aislamiento de contexto y refresco de sesión están documentados. Cualquier fallo de seguridad, corrupción de datos o migración se clasifica como BLOCKER/CRITICAL según [RESULTS_TEMPLATE.md](./RESULTS_TEMPLATE.md). El bloqueo conocido de este repositorio, si no aparece otro, es la ejecución real de Supabase QA.
