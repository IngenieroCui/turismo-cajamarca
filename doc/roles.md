1. ROLES DEL SISTEMA
1. Super Administrador (Platform Owner)
Descripción: control absoluto de la plataforma a nivel infraestructura y negocio. Uso interno del equipo.
Permisos: todos, incluyendo gestión de otros administradores, claves de infraestructura, feature flags globales, kill-switch de módulos.
Crea: administradores, configuración global, políticas de comisión.
Edita: cualquier entidad del sistema.
Elimina: cualquier entidad (con auditoría inmutable obligatoria).
Visualiza: todo, incluyendo logs de seguridad y datos financieros agregados.
Nivel de acceso: máximo (root lógico, no técnico — nunca debe tener acceso directo a producción sin bastión/just-in-time access).
Relación: por encima de Administrador; el único que puede crear/revocar Administradores.
2. Administrador (Platform Admin)
Descripción: operación diaria de la plataforma (CMS, moderación, soporte de segundo nivel, configuración de catálogos maestros).
Permisos: gestión de usuarios, moderación de contenido, configuración de parámetros no críticos, resolución de disputas.
Crea: categorías, contenido editorial, cupones/promociones.
Edita: perfiles de usuarios (con restricciones), ofertas reportadas, configuración de módulos.
Elimina: contenido que viole políticas (soft-delete con auditoría).
Visualiza: dashboards operativos, tickets, reportes agregados (no datos financieros sensibles completos, salvo permiso explícito).
Nivel de acceso: alto, con scoping (puede limitarse por región/departamento).
Relación: subordinado a Super Admin; supervisa Moderador y Soporte.
3. Moderador
Descripción: revisión de contenido generado por usuarios (reseñas, fotos, descripciones de ofertas) y primera línea de cumplimiento de políticas.
Permisos: aprobar/rechazar contenido, suspender temporalmente ofertas o reseñas.
Crea: reportes de incidencia.
Edita: estado de publicación de contenido.
Elimina: contenido spam/abusivo (con log).
Visualiza: cola de moderación, historial de reportes de un usuario.
Nivel de acceso: medio, sin acceso a datos financieros ni PII sensible.
Relación: reporta al Administrador.
4. Prestador Turístico (rol paraguas)
Descripción: rol base para cualquier oferente de servicios. En la práctica se implementa como un rol con subtipos (Agencia, Guía, Hotel, Restaurante, Operador, Transportador, Artesano) porque cada subtipo tiene campos y validaciones distintas (ej. un Transportador necesita datos de flota/licencias; un Guía necesita certificación turística individual), pero comparten el mismo conjunto de permisos base.
Permisos base: gestionar su propio catálogo de ofertas, ver sus reservas, responder reseñas, ver sus métricas.
Crea: ofertas/experiencias, promociones propias, respuestas a reseñas.
Edita: su perfil de negocio, sus ofertas, disponibilidad, precios.
Elimina: sus propias ofertas (soft-delete si tienen reservas históricas).
Visualiza: sus propias reservas, pagos, calificaciones, dashboard de desempeño.
Nivel de acceso: bajo-medio, estrictamente limitado a sus propios recursos (tenant-scoped).
Relación: depende de verificación RNT (badge); interactúa con Turista (reservas) y con Funcionario MinCIT (auditoría).
Sub-roles internos de una Agencia (importante a escala): Dueño de cuenta de negocio (full control) y Empleado/Colaborador (permisos delegados, ej. solo gestionar reservas, no finanzas) — esto lo va a necesitar cualquier hotel con varios empleados.
5. Turista (Usuario Final)
Descripción: consumidor de servicios.
Permisos: buscar, reservar, pagar, calificar, usar el asistente de IA.
Crea: reservas, reseñas, listas de favoritos, tickets de soporte.
Edita: su perfil, sus preferencias, sus reservas (dentro de política de cancelación).
Elimina: su cuenta (derecho ARCO/Habeas Data), sus reseñas propias.
Visualiza: su historial, ofertas públicas verificadas.
Nivel de acceso: bajo, exclusivamente sobre sus propios datos.
Relación: cliente de Prestador; regulado por políticas de Administrador.


6. Auditor (interno, seguridad/cumplimiento)
Descripción: rol técnico-legal interno que revisa integridad del sistema, no operación de negocio.
Permisos: acceso de solo lectura a logs inmutables, trazas blockchain, registros de auditoría de pagos.
Crea: informes de auditoría.
Edita/Elimina: nada (integridad es su función; cualquier capacidad de edición rompe el propósito del rol).
Visualiza: todo lo relacionado a trazabilidad (accesos, cambios de datos sensibles, transacciones), en modo append-only.
Nivel de acceso: alto en lectura, cero en escritura sobre datos operativos.
Relación: independiente de la jerarquía de Administrador (reporte directo a Super Admin o a un comité, para evitar conflicto de interés).
7. Soporte (Atención al Cliente)
Descripción: primera línea de atención a turistas y prestadores.
Permisos: ver tickets, ver (no editar) datos de reserva/pago para resolver casos, iniciar reembolsos dentro de límites predefinidos.
Crea: tickets, notas de resolución.
Edita: estado de tickets.
Elimina: nada de datos de negocio.
Visualiza: datos acotados por ticket, enmascarados (ej. número de tarjeta jamás visible — tokenizado).
Nivel de acceso: medio-bajo, con acceso "just-in-time" a la cuenta específica que atiende (no browsing libre de la base de usuarios).
Relación: escala casos complejos a Administrador.
8. Analista de Datos / BI
Descripción: consume datos agregados para inteligencia de negocio, sin acceso a PII cruda.
Permisos: acceso a datastore analítico (no a la base transaccional productiva).
Crea: dashboards, reportes.
Edita: definiciones de métricas.
Elimina: nada operativo.
Visualiza: datos anonimizados/agregados (data warehouse separado, con pipeline de anonimización obligatorio).
Nivel de acceso: medio, pero aislado de la base productiva por diseño (separación de planos analítico/transaccional).
9. Servicio de IA / Sistema (rol de máquina, no humano)
Descripción: identidad de servicio (service account) para el motor de recomendaciones, el chatbot y los workers de verificación RNT/blockchain.
Permisos: lectura de catálogo y comportamiento (eventos), escritura solo en su propio dominio (tabla de recomendaciones, resultados de scoring).
Crea: recomendaciones, embeddings, scores.
Edita: sus propios modelos/resultados.
Elimina: caché de recomendaciones obsoletas.
Visualiza: datos no sensibles necesarios para inferencia (nunca credenciales de pago, nunca PAN).
Nivel de acceso: acotado por scopes de API (OAuth client credentials), no un usuario humano — debe tener su propio sistema de rotación de secretos.
Relación: consumidor de eventos de todos los dominios vía bus de eventos; nunca actúa como actor con permisos de escritura amplios.
10. Desarrollador / DevOps 
Descripción: acceso técnico a entornos, no a datos de producción salvo excepción auditada ("break-glass").
Permisos: despliegue, configuración de infraestructura, acceso a staging libremente; a producción solo mediante acceso temporal aprobado (PIM/JIT access).
Nivel de acceso: alto técnico, bajo en datos de negocio por defecto.
Relación: no debe compartir cuenta con roles de negocio — separación estricta.


Otros por validar a futuro:
Rol adicional recomendado — Embajador/Afiliado (growth)
Descripción: usuarios que generan enlaces de referido y ganan comisión. Común en plataformas de turismo a escala.
Permisos: generar códigos, ver su comisión.
Nivel de acceso: bajo, similar a Turista + módulo de afiliación.
Funcionario MinCIT / FONTUR
Descripción: rol institucional externo con fines de supervisión regulatoria.
Permisos: consulta de estado RNT, generación de reportes de cumplimiento, alertas de vencimiento.
Crea: reportes oficiales, observaciones formales sobre un prestador.
Edita: nada operativo de la plataforma (rol de solo consulta + anotaciones regulatorias).
Elimina: nada.
Visualiza: dashboards de auditoría, estado agregado del sector, NO datos personales de turistas (solo agregados/anonimizados) — crítico para Habeas Data.
Nivel de acceso: medio, altamente restringido por scope (solo su jurisdicción/departamento), con acceso de solo lectura auditado.
Relación: par institucional de Auditor interno; consumidor de eventos del módulo Verificación RNT.
Cámara de Comercio (rol institucional similar a MinCIT)
Descripción: valida formalización empresarial complementaria al RNT.
Permisos y nivel: similares a Funcionario MinCIT pero scope limitado a validación de registro mercantil.
Relación: fuente de datos adicional para el proceso de verificación de Prestador.

