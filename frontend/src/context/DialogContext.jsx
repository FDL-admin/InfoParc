import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'

const FONT = "'Inter', system-ui, sans-serif"

// ── Contexte ──────────────────────────────────────────────────
const Ctx = createContext(null)

// ── Icônes ────────────────────────────────────────────────────
const icons = {
  danger: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  default: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B5E20" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v4M12 16h.01"/>
    </svg>
  ),
  success: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
}

const iconBg = {
  danger:  '#fef2f2',
  warning: '#fffbeb',
  default: '#f0fdf4',
  success: '#f0fdf4',
}

const confirmBtn = {
  danger:  { bg: '#dc2626', hover: '#b91c1c' },
  warning: { bg: '#d97706', hover: '#b45309' },
  default: { bg: '#1B5E20', hover: '#2E7D32' },
  success: { bg: '#16a34a', hover: '#15803d' },
}

// ── Modal Dialog ──────────────────────────────────────────────
function DialogModal({ dialog, onClose }) {
  const { type, variant = 'default', title, message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', details } = dialog
  const [hov, setHov] = useState(false)
  const btn = confirmBtn[variant] ?? confirmBtn.default

  // Fermeture avec Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
        animation: 'fadeIn .12s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(false) }}
    >
      <div style={{
        background: '#fff',
        borderRadius: '14px',
        padding: '24px',
        width: '100%',
        maxWidth: '420px',
        margin: '0 16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
        animation: 'slideUp .15s ease',
        fontFamily: FONT,
      }}>
        {/* Icône + Titre */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: iconBg[variant] ?? iconBg.default,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {icons[variant] ?? icons.default}
          </div>
          <div style={{ paddingTop: '2px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '600', color: '#111827', fontFamily: FONT }}>
              {title}
            </h3>
            {message && (
              <p style={{ margin: 0, fontSize: '13.5px', color: '#6b7280', lineHeight: '1.5', fontFamily: FONT }}>
                {message}
              </p>
            )}
            {details && (
              <div style={{ marginTop: '10px', padding: '10px 12px', background: '#f9fafb', borderRadius: '8px', fontSize: '12.5px', color: '#374151', fontFamily: FONT, lineHeight: '1.6' }}>
                {details}
              </div>
            )}
          </div>
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
          {type === 'confirm' && (
            <button
              onClick={() => onClose(false)}
              style={{
                padding: '8px 18px', borderRadius: '8px', fontSize: '13.5px',
                border: '1px solid #e5e7eb', background: '#fff', color: '#374151',
                cursor: 'pointer', fontFamily: FONT, fontWeight: '500',
                transition: 'background .12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={() => onClose(true)}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
              padding: '8px 20px', borderRadius: '8px', fontSize: '13.5px',
              border: 'none', color: '#fff', cursor: 'pointer',
              fontFamily: FONT, fontWeight: '500',
              background: hov ? btn.hover : btn.bg,
              transition: 'background .12s',
            }}
          >
            {type === 'confirm' ? confirmLabel : 'OK'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px) scale(.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>,
    document.body
  )
}

// ── Toast notification ────────────────────────────────────────
function Toast({ toasts, remove }) {
  return createPortal(
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9998, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          background: '#fff', border: '1px solid #eaecf0',
          borderRadius: '12px', padding: '14px 16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
          minWidth: '280px', maxWidth: '360px',
          animation: 'slideIn .2s ease',
          fontFamily: FONT,
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
            background: iconBg[t.variant] ?? iconBg.default,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {icons[t.variant] ?? icons.default}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {t.title && <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#111827', marginBottom: '2px' }}>{t.title}</div>}
            {t.message && <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.4' }}>{t.message}</div>}
          </div>
          <button onClick={() => remove(t.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0', lineHeight: 1, fontSize: '18px', flexShrink: 0 }}>×</button>
        </div>
      ))}
      <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(16px) } to { opacity: 1; transform: translateX(0) } }`}</style>
    </div>,
    document.body
  )
}

// ── Provider ──────────────────────────────────────────────────
export function DialogProvider({ children }) {
  const [dialog, setDialog]   = useState(null)
  const [toasts, setToasts]   = useState([])

  const confirm = useCallback((options) => new Promise(resolve => {
    setDialog({ type: 'confirm', ...options, resolve })
  }), [])

  const notify = useCallback((options) => new Promise(resolve => {
    setDialog({ type: 'alert', ...options, resolve })
  }), [])

  const toast = useCallback((options) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, ...options }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), options.duration ?? 4000)
  }, [])

  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const onClose = (result) => {
    dialog?.resolve(result)
    setDialog(null)
  }

  return (
    <Ctx.Provider value={{ confirm, notify, toast }}>
      {children}
      {dialog && <DialogModal dialog={dialog} onClose={onClose} />}
      <Toast toasts={toasts} remove={removeToast} />
    </Ctx.Provider>
  )
}

export const useDialog = () => useContext(Ctx)
