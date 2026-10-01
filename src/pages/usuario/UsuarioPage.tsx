import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../context/useAuthStore';
import { getDefaultRoleRoute } from '../../utils/roleRouting';

const UsuarioPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const roles = profile?.roles || [];
  const hasTouristRole = roles.some(
    (role) => role.code === 'turista' && role.is_active && !role.is_system,
  );

  if (!profile) return <Navigate to="/unauthorized" replace />;

  return (
    <Navigate
      to={hasTouristRole ? '/turista' : getDefaultRoleRoute(roles)}
      replace
    />
  );
};

export default UsuarioPage;
