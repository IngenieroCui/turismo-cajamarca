import React, { useState } from 'react';
import './Footer.css';
import { getPlatformLogo } from './utils/getPlatformLogo';
import { APP_NAME, APP_VERSION } from './config/app';

export const Footer: React.FC = () => {
  const [logoPath] = useState(() => getPlatformLogo());
  const [developerLogoFailed, setDeveloperLogoFailed] = useState(false);
  return <footer className="footer-container">
    <div className="footer-content">
      <div className="footer-section footer-brand"><div className="brand-logo"><img src={logoPath} alt={`${APP_NAME} Logo`} onError={(event) => { event.currentTarget.src = '/web/icon-192.png'; }} /></div><div className="brand-text"><h3>{APP_NAME}</h3><p>Cajamarca - Tolima</p></div></div>
      <div className="footer-section footer-developer"><div className="developer-card">
        <div className="developer-logo">{developerLogoFailed ? <div className="developer-logo-fallback">IN</div> : <img src="/IngNavs.png" alt="IngNavs Logo" onError={() => setDeveloperLogoFailed(true)} />}</div>
        <div className="developer-info"><a href="https://ingnavs.vercel.app/" target="_blank" rel="noopener noreferrer" className="developer-link"><p className="developer-text">Desarrollado por: <span className="developer-name">Ing Navs</span></p></a><p className="developer-version"><span className="status-dot"></span>Versión {APP_VERSION}</p></div>
      </div></div>
      <div className="footer-section footer-rights"><p className="footer-copyright">© {new Date().getFullYear()} Todos los derechos reservados</p><p className="footer-entity">Tecnoparque Tolima</p></div>
    </div>
  </footer>;
};

export default Footer;
