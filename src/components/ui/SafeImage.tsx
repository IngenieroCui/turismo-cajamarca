import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> { src: string; alt: string; }
const SafeImage: React.FC<Props> = ({ src, alt, className = '', ...props }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`flex h-full min-h-24 w-full flex-col items-center justify-center gap-1 bg-[var(--bg-primary)] text-xs text-[var(--text-muted)] ${className}`} role="img" aria-label={`${alt}: Imagen no disponible`}><ImageOff className="h-6 w-6" aria-hidden="true" />Imagen no disponible</div>;
  return <img {...props} src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
};
export default SafeImage;
