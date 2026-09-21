import React from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, Heart, Home, User, ClipboardList } from 'lucide-react';

const items = [
  { to: '/turista', label: 'Inicio', icon: Home, end: true },
  { to: '/turista/atractivos', label: 'Explorar', icon: Compass },
  { to: '/turista/reservas', label: 'Reservas', icon: ClipboardList },
  { to: '/turista/favoritos', label: 'Favoritos', icon: Heart },
  { to: '/turista/perfil', label: 'Perfil', icon: User },
];

const TouristBottomNav: React.FC = () => <nav aria-label="Navegación principal del turista" className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-light)] bg-[var(--bg-secondary)]/95 px-2 pt-2 shadow-2xl backdrop-blur md:hidden" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}><div className="mx-auto grid max-w-md grid-cols-5 gap-1">{items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} aria-label={label} className={({ isActive }) => `flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[11px] font-semibold transition ${isActive ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary-light)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}><Icon className="h-4 w-4" aria-hidden="true" /><span>{label}</span></NavLink>)}</div></nav>;

export default TouristBottomNav;
