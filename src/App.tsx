import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './context/useAuthStore';
import { UserRoleEnum } from './types/auth.types';
import ProtectedRoute from './components/guard/ProtectedRoute';

// Componentes por Carpeta (Estructura organizada del proyecto)
import Login from './pages/login/Login';
import SignUp from './pages/login/SignUp';
import Unauthorized from './pages/Unauthorized';

import UsuarioPage from './pages/usuario/UsuarioPage';

// Módulo Turista y Sub-rutas con Layout & Drawer
import TouristLayout from './pages/turista/TouristLayout';
import TuristaPage from './pages/turista/TuristaPage';
import TouristProfilePage from './pages/turista/TouristProfilePage';
import AtractivosPage from './pages/turista/AtractivosPage';
import AlojamientosPage from './pages/turista/AlojamientosPage';
import GastronomiaPage from './pages/turista/GastronomiaPage';
import ToursPage from './pages/turista/ToursPage';
import EventosPage from './pages/turista/EventosPage';
import ArtesaniasPage from './pages/turista/ArtesaniasPage';
import AsistenciaPage from './pages/turista/AsistenciaPage';

import PrestadorTuristicoPage from './pages/prestador_turistico/PrestadorTuristicoPage';
import AdminPage from './pages/admin/AdminPage';
import SuperAdminPage from './pages/super_admin/SuperAdminPage';
import ModeradorPage from './pages/moderador/ModeradorPage';
import AuditorPage from './pages/auditor/AuditorPage';
import SoportePage from './pages/soporte/SoportePage';
import AnalistaDatosPage from './pages/analista_datos/AnalistaDatosPage';
import ServiciosIaPage from './pages/servicios_ia/ServiciosIaPage';
import DesarrolladorPage from './pages/desarrollador/DesarrolladorPage';
import EmbajadorPage from './pages/embajador/EmbajadorPage';
import AfiliadoPage from './pages/afiliado/AfiliadoPage';
import FuncionarioMincitPage from './pages/funcionario_mincit/FuncionarioMincitPage';
import CamaraComercioPage from './pages/camara_comercio/CamaraComercioPage';

export const App: React.FC = () => {
  const { listenToAuthChanges, user, profile } = useAuthStore();

  useEffect(() => {
    // Listener de cambios de autenticación en Supabase
    const unsubscribe = listenToAuthChanges();
    return () => {
      unsubscribe();
    };
  }, [listenToAuthChanges]);

  // Determinar ruta de dashboard por defecto del usuario autenticado
  const userDefaultRoute = profile?.role ? `/${profile.role}` : '/usuario';

  return (
    <BrowserRouter>
      <Routes>
        {/* Lo primero que carga es la ventana de Login */}
        <Route
          path="/"
          element={user ? <Navigate to={userDefaultRoute} replace /> : <Login />}
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Rutas Protegidas por Rol */}
        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.USUARIO]} />}>
          <Route path="/usuario" element={<UsuarioPage />} />
        </Route>

        {/* MÓDULO TURISTA CON LAYOUT & DRAWER MENU */}
        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.TURISTA, UserRoleEnum.USUARIO]} />}>
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

        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.MODERADOR]} />}>
          <Route path="/moderador" element={<ModeradorPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.AUDITOR]} />}>
          <Route path="/auditor" element={<AuditorPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.SOPORTE]} />}>
          <Route path="/soporte" element={<SoportePage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.ANALISTA_DATOS]} />}>
          <Route path="/analista_datos" element={<AnalistaDatosPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.SERVICIOS_IA]} />}>
          <Route path="/servicios_ia" element={<ServiciosIaPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRoleEnum.DESARROLLADOR]} />}>
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
      </Routes>
    </BrowserRouter>
  );
};

export default App;
