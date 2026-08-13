Actúa como un Arquitecto de Software Senior experto en React, Vite, TypeScript y Supabase. 

Vamos a construir una PWA de turismo con un sistema RBAC de 12 roles (Super Admin, Admin, Moderador, Prestador/Sub-roles, Turista, Auditor, Soporte, BI, Servicio IA, DevOps, Embajador, Entidades Reguladoras). La autenticación se gestionará vía Supabase Auth (Correo y Contraseña).

ARQUITECTURA Y TECNOLOGÍAS:
- Build Tool: Vite + React (TypeScript) + `vite-plugin-pwa`
- Estilos: Tailwind CSS + Lucide Icons
- Enrutamiento: React Router DOM (v6+)
- Estado Global & Auth: Zustand + Supabase JS Client (`@supabase/supabase-js`)
- Validaciones: Zod

TAREAS A GENERAR EN ESTA ITERACIÓN:

1. Configuración de Supabase Client (`src/lib/supabase/client.ts`):
   - Inicializa el cliente de Supabase usando variables de entorno (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`).

2. Definición de Tipos y Roles (`src/types/auth.types.ts`):
   - Define el enum/union de los 12 roles del sistema.
   - Crea las interfaces para el perfil de usuario (`UserProfile`) asociado a la tabla `profiles` de Supabase, incluyendo `role`, `tenant_id` y `permissions`.

3. Store de Autenticación con Zustand (`src/context/useAuthStore.ts`):
   - Maneja el estado de la sesión activa de Supabase (`session`, `user`, `profile`, `loading`).
   - Métodos para: `loginWithEmail(email, password)`, `signUp(email, password, role)`, `logout()`, y verificación de sesión al cargar la app (`listenToAuthChanges`).

4. Componente de Protección de Rutas (`src/components/guard/ProtectedRoute.tsx`):
   - Envoltorio para React Router que verifica si hay usuario autenticado y si su rol tiene permiso para acceder a la ruta. Redirige a `/login` o a `/unauthorized`.

5. Configuración PWA en `vite.config.ts`:
   - Configura `vite-plugin-pwa` con `registerType: 'autoUpdate'`, configurando el Web App Manifest (nombre, theme_color, iconos) y estrategias de caché con Workbox para la PWA.

Aplica código limpio, tipado estricto en TypeScript y separación clara de responsabilidades.