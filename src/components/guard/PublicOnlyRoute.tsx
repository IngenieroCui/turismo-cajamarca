import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../context/useAuthStore';
import { getDefaultRoleRoute } from '../../utils/roleRouting';
import PageLoader from '../PageLoader';

const PublicOnlyRoute: React.FC = () => {
  const { user, profile, loading, initialized } = useAuthStore();
  if (loading || !initialized) return <PageLoader />;
  if (user && profile) {
    const route = getDefaultRoleRoute(profile.roles);
    return <Navigate to={route === '/unauthorized' ? '/turista' : route} replace />;
  }
  return <Outlet />;
};

export default PublicOnlyRoute;
