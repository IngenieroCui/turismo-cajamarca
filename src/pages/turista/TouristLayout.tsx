import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TouristNavbar } from '../../components/layout/TouristNavbar';
import { TouristDrawer } from '../../components/layout/TouristDrawer';
import { Footer } from '../../Footer';
import TouristBottomNav from '../../components/layout/TouristBottomNav';

export const TouristLayout: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col justify-between">
      {/* NAVBAR */}
      <TouristNavbar isDrawerOpen={isDrawerOpen} onOpenDrawer={() => setIsDrawerOpen(true)} />

      {/* DRAWER MENU */}
      <TouristDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* CONTENIDO PRINCIPAL DE CADA SUB-RUTA */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      {/* FOOTER GENERAL */}
      <Footer />
      <TouristBottomNav />
    </div>
  );
};

export default TouristLayout;
