import React, { useEffect, useRef, useState } from 'react';
import { AppNotification, useNotifications } from '../notifications';
import { useStrings } from '../i18n';

const SEVERITY_COLOR: Record<AppNotification['severity'], string> = {
  info:    '#3b82f6',
  warning: '#f59e0b',
  error:   '#dc2626',
  success: '#16a34a',
};

const CATEGORY_ICON: Record<AppNotification['category'], string> = {
  ORDER:     '📋',
  INVENTORY: '📦',
  WAREHOUSE: '🏭',
};

export default function NotificationsPanel() {
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const s = useStrings();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Notifications"
        style={{
          position: 'relative',
          background: 'transparent',
          border: 'none',
          color: '#f8fafc',
          cursor: 'pointer',
          fontSize: '1.25rem',
          padding: '0.4rem 0.6rem',
          borderRadius: 6,
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 0,
            background: '#dc2626', color: '#fff',
            borderRadius: 999, fontSize: '0.65rem', fontWeight: 700,
            padding: '0.05rem 0.4rem', lineHeight: '1rem',
            minWidth: 18, textAlign: 'center',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0,
          width: 360, maxHeight: 480, overflow: 'auto',
          background: '#fff', color: '#1e293b',
          border: '1px solid #e2e8f0', borderRadius: 10,
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
          zIndex: 100,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0',
            position: 'sticky', top: 0, background: '#fff', zIndex: 1,
          }}>
            <strong style={{ fontSize: '0.95rem' }}>{s.notifications.title}</strong>
            <button
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0}
              style={{
                background: 'transparent',
                border: 'none',
                color: unreadCount === 0 ? '#94a3b8' : '#3b82f6',
                cursor: unreadCount === 0 ? 'default' : 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              {s.notifications.markAll}
            </button>
          </div>

          {items.length === 0 ? (
            <p style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
              {s.notifications.noItems}
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {items.map(n => (
                <li
                  key={n.id}
                  onClick={() => { if (!n.read) void markRead(n.id); }}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid #f1f5f9',
                    background: n.read ? '#fff' : '#eff6ff',
                    cursor: n.read ? 'default' : 'pointer',
                    display: 'flex', gap: '0.625rem',
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{CATEGORY_ICON[n.category] ?? '🔔'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.85rem', color: SEVERITY_COLOR[n.severity] }}>{n.title}</strong>
                      {!n.read && <span style={{ width: 6, height: 6, borderRadius: 999, background: '#3b82f6' }} />}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.125rem' }}>{n.message}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
