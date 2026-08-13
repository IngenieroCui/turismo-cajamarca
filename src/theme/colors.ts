/**
 * Paleta de Colores Centralizada del Sistema Turismo Cajamarca
 * Modifica los valores en este archivo para actualizar la paleta visual de toda la aplicación.
 */
export const colors = {
  // Marca Principal & Contrastes
  primary: '#0d9488', // Teal 600
  primaryHover: '#0f766e', // Teal 700
  primaryLight: '#14b8a6', // Teal 500
  primaryDark: '#115e59', // Teal 800
  primaryContrast: '#ffffff',

  // Colores Secundarios & Acentos
  secondary: '#0ea5e9', // Sky 500
  accent: '#f59e0b', // Amber 500
  info: '#38bdf8', // Sky 400
  success: '#22c55e', // Emerald 500
  warning: '#eab308', // Yellow 500
  danger: '#ef4444', // Red 500

  // Fondos
  bgPrimary: '#0f172a', // Slate 900
  bgSecondary: '#1e293b', // Slate 800
  bgCard: '#1e293b',
  bgPaper: '#0f172a',
  bgHover: '#334155', // Slate 700

  // Textos
  textPrimary: '#f8fafc', // Slate 50
  textSecondary: '#94a3b8', // Slate 400
  textMuted: '#64748b', // Slate 500
  textInverse: '#0f172a',

  // Bordes & Sombras
  borderLight: 'rgba(255, 255, 255, 0.1)',
  borderMedium: 'rgba(255, 255, 255, 0.2)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
} as const;

export type ColorPalette = typeof colors;
