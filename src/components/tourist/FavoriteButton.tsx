import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { addFavorite, getFavoriteItemIds, removeFavorite } from '../../services/catalogService';

interface FavoriteButtonProps {
  itemId: string;
  className?: string;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({ itemId, className = '' }) => {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void getFavoriteItemIds().then((ids) => {
      if (mounted) setActive(ids.includes(itemId));
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, [itemId]);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      if (active) await removeFavorite(itemId);
      else await addFavorite(itemId);
      setActive(!active);
    } catch {
      setError('No fue posible actualizar favoritos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="relative">
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={loading}
      aria-label={active ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      title={active ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      className={`p-2 rounded-full bg-black/60 backdrop-blur-md transition cursor-pointer disabled:opacity-50 ${active ? 'text-rose-400' : 'text-white hover:text-rose-300'} ${className}`}
    >
      <Heart className="w-4 h-4" fill={active ? 'currentColor' : 'none'} />
    </button>
    {error && <span role="alert" className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg bg-red-950/90 p-2 text-[10px] text-red-200">{error}</span>}
    </span>
  );
};

export default FavoriteButton;
