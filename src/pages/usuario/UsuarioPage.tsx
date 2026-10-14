import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../context/useAuthStore';
import { getDefaultRoleRoute } from '../../utils/roleRouting';
import PageLoader from '../../components/PageLoader';

const UsuarioPage: React.FC = () => {
  const { profile, loading, initialized } = useAuthStore();

  if (loading || !initialized) return <PageLoader />;
  if (!profile) return <Navigate to="/login" replace />;

  const roles = profile.roles || [];
  const targetRoute = getDefaultRoleRoute(roles);

  return <Navigate to={targetRoute} replace />;
};

export default UsuarioPage;
