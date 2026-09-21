import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../../services/notificationService';

const UPDATE_ERROR = 'No fue posible actualizar las notificaciones.';

const relativeTime = (value: string): string => {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).valueOf()) / 1000));
  if (seconds < 60) return 'Ahora';
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
  return new Date(value).toLocaleDateString('es-CO');
};

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [rows, setRows] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      setCount(await getUnreadNotificationCount());
    } catch {
      // La campana no debe bloquear el panel si la consulta falla.
    }
  }, []);

  const refreshRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await getNotifications());
      await refreshCount();
    } catch {
      setError('No fue posible cargar las notificaciones.');
    } finally {
      setLoading(false);
    }
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      bellRef.current?.focus();
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refreshCount(), 0);
    const interval = window.setInterval(() => void refreshCount(), 60000);
    const onFocus = () => void refreshCount();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshCount]);

  const readOne = async (notification: AppNotification) => {
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification.id);
      } catch {
        setError(UPDATE_ERROR);
        return;
      }
      setRows((current) =>
        current.map((row) => (row.id === notification.id ? { ...row, isRead: true } : row)),
      );
      setCount((current) => Math.max(0, current - 1));
    }

    setError(null);
    if (notification.actionPath) {
      setOpen(false);
      navigate(notification.actionPath);
    }
  };

  const readAll = async () => {
    try {
      await markAllNotificationsRead();
    } catch {
      setError(UPDATE_ERROR);
      return;
    }
    setRows((current) => current.map((row) => ({ ...row, isRead: true })));
    setCount(0);
    setError(null);
  };

  const ariaLabel = count > 0 ? `Notificaciones, ${count} sin leer` : 'Notificaciones';

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={bellRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        title="Notificaciones"
        className="relative cursor-pointer rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void refreshRows();
        }}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notifications-panel"
          role="dialog"
          aria-label="Panel de notificaciones"
          className="absolute right-0 top-12 z-[80] w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-[var(--border-medium)] bg-[var(--bg-secondary)] shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-light)] p-3">
            <strong className="text-xs">Notificaciones</strong>
            {count > 0 && (
              <button
                type="button"
                className="cursor-pointer text-[10px] font-bold text-[var(--color-primary-light)]"
                onClick={() => void readAll()}
              >
                Marcar todas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && <p className="p-4 text-xs text-[var(--text-secondary)]">Cargando notificaciones...</p>}
            {error && (
              <p role="alert" className="p-4 text-xs text-red-300">
                {error}
              </p>
            )}
            {!loading && rows.length === 0 && (
              <p className="p-4 text-xs text-[var(--text-secondary)]">No tienes notificaciones.</p>
            )}
            {!loading &&
              rows.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={`w-full cursor-pointer border-b border-[var(--border-light)] p-3 text-left hover:bg-[var(--bg-hover)] ${
                    notification.isRead ? 'opacity-70' : 'bg-[var(--color-primary)]/5'
                  }`}
                  onClick={() => void readOne(notification)}
                >
                  <div className="flex gap-2">
                    <span
                      aria-hidden="true"
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        notification.isRead ? 'bg-[var(--text-muted)]' : 'bg-emerald-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">{notification.title}</p>
                      <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{notification.body}</p>
                      <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                        {relativeTime(notification.createdAt)}
                        {notification.actionPath && (
                          <ExternalLink className="ml-1 inline h-3 w-3" aria-hidden="true" />
                        )}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                    )}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
