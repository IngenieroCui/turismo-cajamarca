/**
 * Detecta la plataforma (Android, iOS o Web) y retorna la ruta del logo oficial correspondiente
 * ubicado en la estructura de carpetas /android, /ios o /web.
 */
export const getPlatformLogo = (): string => {
  if (typeof window === 'undefined') {
    return '/web/icon-192.png';
  }

  const userAgent = (navigator.userAgent || navigator.vendor || '').toLowerCase();

  if (userAgent.includes('android')) {
    return '/android/play_store_512.png';
  }

  if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod')) {
    return '/ios/AppIcon~ios-marketing.png';
  }

  return '/web/icon-192.png';
};
