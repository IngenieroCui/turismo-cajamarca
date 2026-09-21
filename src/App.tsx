import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './context/useAuthStore';
import { UserRoleEnum } from './types/auth.types';
import ProtectedRoute from './components/guard/ProtectedRoute';
import PublicOnlyRoute from './components/guard/PublicOnlyRoute';
import PageLoader from './components/PageLoader';

// Componentes por Carpeta (Estructura organizada del proyecto)
import Login from './pages/login/Login';
import SignUp from './pages/login/SignUp';
import Unauthorized from './pages/Unauthorized';

const UsuarioPage = lazy(() => import('./pages/usuario/UsuarioPage'));

// Módulo Turista y Sub-rutas con Layout & Drawer
const TouristLayout = lazy(() => import('./pages/turista/TouristLayout'));
const TuristaPage = lazy(() => import('./pages/turista/TuristaPage'));
const TouristProfilePage = lazy(() => import('./pages/turista/TouristProfilePage'));
const AtractivosPage = lazy(() => import('./pages/turista/AtractivosPage'));
const AlojamientosPage = lazy(() => import('./pages/turista/AlojamientosPage'));
const GastronomiaPage = lazy(() => import('./pages/turista/GastronomiaPage'));
const ToursPage = lazy(() => import('./pages/turista/ToursPage'));
const EventosPage = lazy(() => import('./pages/turista/EventosPage'));
const ArtesaniasPage = lazy(() => import('./pages/turista/ArtesaniasPage'));
const AsistenciaPage = lazy(() => import('./pages/turista/AsistenciaPage'));
const MisReservasPage = lazy(() => import('./pages/turista/MisReservasPage'));
const FavoritosPage = lazy(() => import('./pages/turista/FavoritosPage'));
const AsistentePage = lazy(() => import('./pages/turista/AsistentePage'));

const PrestadorTuristicoPage = lazy(() => import('./pages/prestador_turistico/PrestadorTuristicoPage'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));
const SuperAdminPage = lazy(() => import('./pages/super_admin/SuperAdminPage'));
const ModeradorPage = lazy(() => import('./pages/moderador/ModeradorPage'));
const AuditorPage = lazy(() => import('./pages/auditor/AuditorPage'));
const SoportePage = lazy(() => import('./pages/soporte/SoportePage'));
const AnalistaDatosPage = lazy(() => import('./pages/analista_datos/AnalistaDatosPage'));
const ServiciosIaPage = lazy(() => import('./pages/servicios_ia/ServiciosIaPage'));
const DesarrolladorPage = lazy(() => import('./pages/desarrollador/DesarrolladorPage'));
const EmbajadorPage = lazy(() => import('./pages/embajador/EmbajadorPage'));
const AfiliadoPage = lazy(() => import('./pages/afiliado/AfiliadoPage'));
const FuncionarioMincitPage = lazy(() => import('./pages/funcionario_mincit/FuncionarioMincitPage'));
const CamaraComercioPage = lazy(() => import('./pages/camara_comercio/CamaraComercioPage'));
import { getDefaultRoleRoute } from './utils/roleRouting';
import ReferralTracker from './components/referral/ReferralTracker';
import MaintenanceBanner from './components/MaintenanceBanner';
import { usePlatformConfig } from './context/usePlatformConfig';
import { useProviderContext } from './context/useProviderContext';

export const App: React.FC = () => {
  const { listenToAuthChanges, user, profile, loading, initialized } = useAuthStore();
  const loadPlatformConfig = usePlatformConfig((state) => state.load);
  const resetProviderContext = useProviderContext((state) => state.reset);

  useEffect(() => {
    // Listener de cambios de autenticación en Supabase
    const unsubscribe = listenToAuthChanges();
    return () => {
      unsubscribe();
    };
  }, [listenToAuthChanges]);

  useEffect(() => { void loadPlatformConfig(); }, [loadPlatformConfig]);
  useEffect(() => { resetProviderContext(); }, [user?.id, resetProviderContext]);

  // Determinar ruta de dashboard por defecto del usuario autenticado
  const userDefaultRoute = getDefaultRoleRoute(profile?.roles);

  return (
    <BrowserRouter>
      <ReferralTracker />
      <MaintenanceBanner />
      <Suspense fallback={<PageLoader />}><Routes>
        {/* Lo primero que carga es la ventana de Login */}
        <Route
          path="/"
          element={loading || !initialized ? <PageLoader /> : user && profile ? <Navigate to={userDefaultRoute} replace /> : <Login />}
        />
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
        </Route>
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/dashboard" element={user ? <Navigate to={userDefaultRoute} replace /> : <Navigate to="/login" replace />} />

        {/* Rutas Protegidas por Rol */}
        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.USUARIO]} allowEmptyHumanRoles />}>
          <Route path="/usuario" element={<UsuarioPage />} />
        </Route>

        {/* MÓDULO TURISTA CON LAYOUT & DRAWER MENU */}
        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.TURISTA]} />}>
          <Route path="/turista" element={<TouristLayout />}>
            <Route index element={<TuristaPage />} />
            <Route path="perfil" element={<TouristProfilePage />} />
            <Route path="atractivos" element={<AtractivosPage />} />
            <Route path="alojamientos" element={<AlojamientosPage />} />
            <Route path="gastronomia" element={<GastronomiaPage />} />
            <Route path="tours" element={<ToursPage />} />
            <Route path="eventos" element={<EventosPage />} />
            <Route path="artesanias" element={<ArtesaniasPage />} />
            <Route path="asistencia" element={<AsistenciaPage />} />
            <Route path="reservas" element={<MisReservasPage />} />
            <Route path="favoritos" element={<FavoritosPage />} />
            <Route path="asistente" element={<AsistentePage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.PRESTADOR_TURISTICO]} />}>
          <Route path="/prestador_turistico" element={<PrestadorTuristicoPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.ADMIN]} />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.SUPER_ADMIN]} />}>
          <Route path="/super_admin" element={<SuperAdminPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.MODERADOR, UserRoleEnum.ADMIN, UserRoleEnum.SUPER_ADMIN]} requiredPermissions={['content:moderate']} />}>
          <Route path="/moderador" element={<ModeradorPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.AUDITOR]} />}>
          <Route path="/auditor" element={<AuditorPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.SOPORTE, UserRoleEnum.ADMIN, UserRoleEnum.SUPER_ADMIN]} requiredPermissions={['support:tickets_manage']} />}>
          <Route path="/soporte" element={<SoportePage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.ANALISTA_DATOS, UserRoleEnum.ADMIN, UserRoleEnum.SUPER_ADMIN]} requiredPermissions={['bi:analytics_read']} />}>
          <Route path="/analista_datos" element={<AnalistaDatosPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.SUPER_ADMIN]} />}>
          <Route path="/servicios_ia" element={<ServiciosIaPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.DESARROLLADOR, UserRoleEnum.SUPER_ADMIN]} requiredPermissions={['devops:infra_manage']} />}>
          <Route path="/desarrollador" element={<DesarrolladorPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.EMBAJADOR]} />}>
          <Route path="/embajador" element={<EmbajadorPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.AFILIADO]} />}>
          <Route path="/afiliado" element={<AfiliadoPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.FUNCIONARIO_MINCIT]} />}>
          <Route path="/funcionario_mincit" element={<FuncionarioMincitPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.CAMARA_COMERCIO]} />}>
          <Route path="/camara_comercio" element={<CamaraComercioPage />} />
        </Route>

        {/* Fallback 404 -> Redirigir a ventana principal de Login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes></Suspense>
    </BrowserRouter>
  );
};

export default App;
