import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'
import { useDialog } from '../../context/DialogContext'
import { useAuth } from '../../context/AuthContext'
import { createPortal } from 'react-dom'

const FONT = "'Inter', system-ui, sans-serif"

const ROLE_MAP = {
  user:       { bg: '#dbeafe', color: '#1e40af', label: 'Utilisateur' },
  admin:      { bg: '#ede9fe', color: '#5b21b6', label: 'Admin technicien' },
  superadmin: { bg: '#dcfce7', color: '#166534', label: 'Superadmin' },
}

function Badge({ value, map }) {
  const s = map[value] ?? { bg: '#f3f4f6', color: '#6b7280', label: value }
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: '11.5px', padding: '3px 10px', borderRadius: '6px', fontWeight: '500', fontFamily: FONT }}>
      {s.label}
    </span>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6', fontFamily: FONT }}>
      <span style={{ fontSize: '13px', color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: '13.5px', fontWeight: '500', color: '#111827' }}>{value || '—'}</span>
    </div>
  )
}

// ── Modal réinitialisation mot de passe ───────────────────────
function ResetPasswordModal({ userId, onClose }) {
  const [newPwd,  setNewPwd]  = useState('')
  const [confPwd, setConfPwd] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!newPwd || !confPwd) { setError('Tous les champs sont obligatoires.'); return }
    if (newPwd.length < 8)   { setError('Minimum 8 caractères.'); return }
    if (newPwd !== confPwd)  { setError('Les mots de passe ne correspondent pas.'); return }
    setSaving(true); setError('')
    try {
      await api.post(`/users/${userId}/change_password/`, { new_password: newPwd, new_password_confirm: confPwd })
      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch (e) {
      const d = e.response?.data
      setError(d && typeof d === 'object' ? Object.values(d).flat().join(' — ') : 'Erreur lors de la réinitialisation.')
      setSaving(false)
    }
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '400px', margin: '0 16px', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', fontFamily: FONT }}>
        <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: '600', color: '#111827' }}>Réinitialiser le mot de passe</h3>

        {success ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Mot de passe réinitialisé avec succès.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">Nouveau mot de passe<span className="required">*</span></label>
                <input type="password" className="form-input" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Minimum 8 caractères" autoFocus/>
              </div>
              <div>
                <label className="form-label">Confirmer<span className="required">*</span></label>
                <input type="password" className="form-input" value={confPwd} onChange={e => setConfPwd(e.target.value)} placeholder="Répéter le mot de passe"/>
              </div>
            </div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#991b1b', marginBottom: '16px' }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn-secondary" onClick={onClose}>Annuler</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Enregistrement…' : 'Réinitialiser'}</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

// ── Page ─────────────────────────────────────────────────────
export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirm } = useDialog()
  const { user: me } = useAuth()

  const [user,              setUser]              = useState(null)
  const [loading,           setLoading]           = useState(true)
  const [editingRole,       setEditingRole]       = useState(false)
  const [newRole,           setNewRole]           = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [roleError,         setRoleError]         = useState('')

  const isAdmin      = me?.role === 'admin' || me?.role === 'superadmin'
  const isSuperAdmin = me?.role === 'superadmin'
  const isSelf       = me?.id === parseInt(id)

  const fetchUser = () => {
    api.get(`/users/${id}/`)
      .then(r => { setUser(r.data); setNewRole(r.data.role) })
      .catch(() => navigate('/users'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { fetchUser() }, [id])

  const handleRoleChange = async () => {
    try {
      await api.patch(`/users/${id}/`, { role: newRole })
      setEditingRole(false); fetchUser()
    } catch (e) {
      setRoleError(e.response?.data?.detail ?? 'Erreur lors du changement de rôle.')
    }
  }

  const handleToggleActive = async () => {
    const ok = await confirm({
      title: user.is_active ? 'Désactiver l\'utilisateur' : 'Activer l\'utilisateur',
      message: `Voulez-vous ${user.is_active ? 'désactiver' : 'activer'} ${user.first_name} ${user.last_name} ?`,
      variant: user.is_active ? 'warning' : 'default',
      confirmLabel: user.is_active ? 'Désactiver' : 'Activer',
    })
    if (!ok) return
    try { await api.post(`/users/${id}/toggle_active/`); fetchUser() }
    catch { /* silently ignore */ }
  }

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Supprimer l\'utilisateur',
      message: `Supprimer définitivement ${user.first_name} ${user.last_name} ?`,
      details: 'Cette action est irréversible. Toutes les données associées seront perdues.',
      variant: 'danger', confirmLabel: 'Supprimer définitivement',
    })
    if (!ok) return
    try { await api.delete(`/users/${id}/`); navigate('/users') }
    catch { /* silently ignore */ }
  }

  if (loading) return <AppLayout><div style={{ padding: '2rem', color: '#1B5E20', fontFamily: FONT }}>Chargement…</div></AppLayout>
  if (!user)   return null

  const roleStyle = ROLE_MAP[user.role] ?? { bg: '#f3f4f6', color: '#6b7280', label: user.role }
  const initials  = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()

  return (
    <AppLayout topbar={
      <TopBar title={
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: FONT }}>
          <button onClick={() => navigate('/users')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontFamily: FONT }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Utilisateurs
          </button>
          <span style={{ color: '#d1d5db' }}>/</span>
          <span style={{ color: '#111827', fontWeight: '500' }}>{user.first_name} {user.last_name}</span>
        </span>
      }/>
    }>
      <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100%' }}>
        <div style={{ maxWidth: '580px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ── Carte identité ── */}
          <div style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: '700', color: '#fff', flexShrink: 0, fontFamily: FONT }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '17px', fontWeight: '600', color: '#fff', fontFamily: FONT }}>{user.first_name} {user.last_name}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '2px', fontFamily: FONT }}>{user.email}</div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <Badge value={user.role} map={ROLE_MAP} />
                  <span style={{ background: user.is_active ? '#dcfce7' : '#fee2e2', color: user.is_active ? '#166534' : '#991b1b', fontSize: '11.5px', padding: '3px 10px', borderRadius: '6px', fontWeight: '500', fontFamily: FONT }}>
                    {user.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ padding: '4px 24px 8px' }}>
              <InfoRow label="Département" value={user.department_detail?.name} />
              <InfoRow label="Membre depuis" value={new Date(user.date_joined).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} />
            </div>
          </div>

          {/* ── Actions admin ── */}
          {isAdmin && !isSelf && (
            <div style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: FONT }}>
                Actions d'administration
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* Changer le rôle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#374151', fontFamily: FONT }}>Rôle</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px', fontFamily: FONT }}>Définit les permissions d'accès</div>
                  </div>
                  {editingRole ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <select className="form-select" style={{ width: '160px' }} value={newRole} onChange={e => setNewRole(e.target.value)}>
                        <option value="user">Utilisateur</option>
                        {isSuperAdmin && <option value="admin">Admin technicien</option>}
                        {isSuperAdmin && <option value="superadmin">Superadmin</option>}
                      </select>
                      <button className="btn-primary" style={{ padding: '7px 14px' }} onClick={handleRoleChange}>OK</button>
                      <button className="btn-secondary" style={{ padding: '7px 14px' }} onClick={() => { setEditingRole(false); setNewRole(user.role) }}>✕</button>
                    </div>
                  ) : (
                    <button className="btn-secondary" onClick={() => setEditingRole(true)}>Modifier</button>
                  )}
                </div>
                {roleError && <p style={{ fontSize: '12px', color: '#dc2626', margin: '-8px 0 0', fontFamily: FONT }}>{roleError}</p>}

                {/* Réinitialiser MDP */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#374151', fontFamily: FONT }}>Mot de passe</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px', fontFamily: FONT }}>Définir un nouveau mot de passe</div>
                  </div>
                  <button className="btn-secondary" onClick={() => setShowPasswordModal(true)}>Réinitialiser</button>
                </div>

                {/* Activer / Désactiver */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#374151', fontFamily: FONT }}>Accès au compte</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px', fontFamily: FONT }}>
                      {user.is_active ? 'Compte actif — peut se connecter' : 'Compte désactivé — connexion bloquée'}
                    </div>
                  </div>
                  <button
                    onClick={handleToggleActive}
                    style={{
                      padding: '7px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: FONT, fontWeight: '500', transition: 'all .12s',
                      background: user.is_active ? '#fff' : '#fff',
                      color: user.is_active ? '#d97706' : '#16a34a',
                      border: `1px solid ${user.is_active ? '#fcd34d' : '#bbf7d0'}`,
                    }}
                  >
                    {user.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                </div>

                {/* Supprimer */}
                {isSuperAdmin && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#991b1b', fontFamily: FONT }}></div>
                      <div style={{ fontSize: '12px', color: '#f87171', marginTop: '2px', fontFamily: FONT }}>Suppression définitive et irréversible</div>
                    </div>
                    <button className="btn-danger" onClick={handleDelete}>Supprimer</button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {showPasswordModal && <ResetPasswordModal userId={id} onClose={() => setShowPasswordModal(false)} />}
    </AppLayout>
  )
}
