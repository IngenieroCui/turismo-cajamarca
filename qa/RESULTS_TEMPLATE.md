# Turismo Cajamarca — Plantilla de resultados QA

> LIVE SUPABASE QA NOT EXECUTED. Esta plantilla permanece sin ejecutar hasta disponer de un proyecto Supabase NON-PRODUCTION; las filas no deben marcarse PASS por inspección estática.

Proyecto: `______________________________`
Ambiente: `NON-PRODUCTION`
Fecha: `________________`
Ejecutor: `________________`
Commit/build: `________________`

## Resultados

| ID | Persona | Área | Escenario | Expected | Actual | Status | Severity | Evidence | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QA-001 |  |  |  |  |  | PASS / FAIL / BLOCKED |  |  |  |
| QA-002 |  |  |  |  |  | PASS / FAIL / BLOCKED |  |  |  |
| QA-003 |  |  |  |  |  | PASS / FAIL / BLOCKED |  |  |  |
| QA-004 |  |  |  |  |  | PASS / FAIL / BLOCKED |  |  |  |
| QA-005 |  |  |  |  |  | PASS / FAIL / BLOCKED |  |  |  |

Duplicar filas según la matriz. `Evidence` debe apuntar a una captura, video, log o respuesta sanitizada almacenada fuera de este repositorio. No registrar contraseñas, tokens ni correos reales.

## Severidad

| Severidad | Definición |
| --- | --- |
| `BLOCKER` | La aplicación no puede continuar o existe un error de migración que impide ejecutar la matriz. |
| `CRITICAL` | Problema de seguridad, autorización, fuga de datos o corrupción de datos. |
| `HIGH` | Flujo principal inutilizable para una persona o rol. |
| `MEDIUM` | Flujo degradado, pero existe una alternativa operativa razonable. |
| `LOW` | Comportamiento menor sin impacto relevante en el flujo principal. |
| `COSMETIC` | Solo afecta presentación visual, espaciado o estilo. |

## Ficha obligatoria para FAIL/BLOCKED

Persona/cuenta placeholder: `________________`
Ruta: `________________`
Operación: `________________`
Expected: `________________`
Actual: `________________`
Status: `FAIL / BLOCKED`
Severity: `BLOCKER / CRITICAL / HIGH / MEDIUM / LOW / COSMETIC`
Browser console error: `________________`
Supabase/RPC error: `________________`
Reproduction steps: `________________`
Evidence: `________________`
Notes/owner: `________________`
