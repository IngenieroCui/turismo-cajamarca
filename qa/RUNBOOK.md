# Turismo Cajamarca — Runbook de QA en vivo

QA-2.1 · Procedimiento reproducible para un entorno Supabase no productivo.

## STEP 1 — Proyecto

Crear o elegir un proyecto Supabase **NON-PRODUCTION** dedicado a QA. No ejecutar esta matriz contra producción. Confirmar quién administra el proyecto, su URL, su ref de proyecto y el mecanismo de recuperación antes de aplicar SQL.

## STEP 2 — Aplicar SQL

Para una base que ya contiene el esquema base, aplicar en este orden:

1. `sql/08_refactor_rbac_multi_role.sql`
2. `sql/09_core_tourism_marketplace.sql`
3. `sql/10_platform_operations_growth.sql`
4. `sql/11_experience_intelligence_engagement.sql`
5. `sql/12_platform_functional_closure.sql`
6. `sql/13_stabilization_data_integrity.sql`

Para una base vacía, aplicar únicamente `sql/00_master_schema_all_in_one.sql` como esquema inicial y luego seguir el procedimiento de despliegue acordado para el entorno. No crear migration 14 ni alterar el orden.

## STEP 3 — Verificación de SQL

Después de cada archivo:

- confirmar que el editor SQL no reporta errores;
- revisar funciones, tablas, políticas RLS y grants creados;
- confirmar que no hay sentencia parcialmente aplicada;
- guardar el resultado de la ejecución y timestamp como evidencia.

Si una migración falla, detener la ejecución, clasificar como `BLOCKER`, conservar el error exacto y no continuar suponiendo que el esquema quedó completo.

## STEP 4 — Crear cuentas QA

Crear las 19 cuentas placeholder y los dos negocios de prueba descritos en [LIVE_QA_MATRIX.md](./LIVE_QA_MATRIX.md). No escribir contraseñas en el repositorio, en capturas ni en la matriz. Confirmar el flujo de email/confirmación con el proveedor de correo de QA; no usar correos reales.

Crear datos mínimos controlados:

- un catálogo publicado y uno pendiente de moderación;
- una oferta reservable, disponibilidad y una promoción;
- reservas en estados solicitada, confirmada, completada e incompleta;
- un pago externo pendiente;
- una reseña pendiente;
- un ticket con mensaje público y nota interna;
- una visita/referral válida y una cancelación para comisión;
- perfiles regulatorios QA para RNT y registro mercantil.

## STEP 5 — Asignar roles

Asignar roles mediante la aplicación o el flujo de Super Admin cuando la funcionalidad que se prueba es precisamente la asignación. No editar la base de datos para simular ese comportamiento. Para colaboradores, usar la pantalla de equipo del provider owner y registrar provider, member role, permisos y estado resultantes.

Para pruebas de seguridad negativas, el SQL/RPC directo sí puede utilizarse como intento autenticado; nunca como forma de preparar permisos positivos. Verificar que la sesión activa y el usuario objetivo sean los placeholders correctos antes de cada operación.

## STEP 6 — Ejecutar la matriz

Ejecutar los bloques en este orden:

1. login, confirmación y logout;
2. Tourist y Legacy Usuario;
3. Provider Owner A/B;
4. colaboradores y cambio de contexto;
5. Moderator, Support, Auditor, Analyst y DevOps;
6. MinCIT y Chamber;
7. Affiliate y Ambassador;
8. Admin y Super Admin;
9. feature flags;
10. multi-role y security negative tests.

Para cada escenario comprobar UI, ruta directa, refresh de página y llamada de servidor cuando aplique. La UI escondida no demuestra autorización.

## STEP 7 — Registrar resultado

Usar [RESULTS_TEMPLATE.md](./RESULTS_TEMPLATE.md) y clasificar cada escenario como:

- `PASS`: resultado esperado observado y evidencia suficiente;
- `FAIL`: resultado distinto al esperado;
- `BLOCKED`: no se pudo ejecutar por una dependencia o error previo.

No convertir una prueba no ejecutada en PASS. Un caso bloqueado debe apuntar a su bloqueo original para evitar duplicar síntomas.

## STEP 8 — Detalle de cada fallo

Para todo `FAIL` o `BLOCKED` registrar:

- persona y cuenta placeholder;
- ruta o pantalla;
- operación exacta;
- esperado;
- actual;
- error de consola del navegador;
- error de Supabase/RPC/RLS;
- pasos mínimos de reproducción;
- timestamp, ambiente y evidencia segura.

No incluir contraseñas, tokens, cookies, service keys ni correos reales. Sanitizar capturas y exportaciones antes de compartirlas.

## Cierre

Al terminar, exportar la matriz y los resultados fuera del repositorio si contienen IDs de datos QA. Reportar por separado los defectos de frontend, SQL/RLS, datos de prueba y configuración del proyecto. La ejecución real contra Supabase es el paso restante esperado cuando todos los checks locales pasan.
