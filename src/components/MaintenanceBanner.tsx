import React from 'react';
import { Wrench } from 'lucide-react';
import { useAuthStore } from '../context/useAuthStore';
import { usePlatformConfig } from '../context/usePlatformConfig';

const MaintenanceBanner: React.FC = () => {
  const { user } = useAuthStore();
  const maintenanceMode = usePlatformConfig((state) => state.maintenanceMode);
  if (!user || !maintenanceMode) return null;
  return (
    <div className="sticky top-0 z-[80] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-xs font-semibold text-slate-950">
      <Wrench className="h-4 w-4" />
      <span>La plataforma está en mantenimiento. Algunas operaciones están temporalmente deshabilitadas.</span>
    </div>
  );
};

export default MaintenanceBanner;
