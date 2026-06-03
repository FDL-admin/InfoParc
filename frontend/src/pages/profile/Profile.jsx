import { useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

const FONT = "'Inter', system-ui, sans-serif"

const ROLE_MAP = {
  user:       { bg: '#dbeafe', color: '#1e40af', label: 'Utilisateur' },
  admin:      { bg: '#ede9fe', color: '#5b21b6', label: 'Admin technicien' },
  superadmin: { bg: '#dcfce7', color: '#166534', label: 'Superadmin' },
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ fontSize: '13px', color: '#6b7280', fontFamily: FONT }}>{label}</span>
      <span style={{ fontSize: '13.5px', color: '#111827', fontWeight: '500', fontFamily: FONT }}>{value || '—'}</span>
    </div>
  )
}

export default function Profile() {
  const { user } = useAuth()

  const [oldPwd,  setOldPwd]  = useState('')
  const [newPwd,  setNewPwd]  = useState('')
  const [confPwd, setConfPwd] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '?'

  const roleStyle = ROLE_MAP[user?.role] ?? { bg: '#f3f4f6', color: '#6b7280', label: user?.role }

  const handleChangePassword = async () => {
    setError('')
    if (!oldPwd || !newPwd || !confPwd) { setError('Tous les champs sont obligatoires.'); return }
    if (newPwd.length < 8) { setError('Le nouveau mot de passe doit contenir au moins 8 caractères.'); return }
    if (newPwd !== confPwd) { setError('Les mots de passe ne correspondent pas.'); return }

    setSaving(true)
    try {
      await api.post(`/users/${user.id}/change_password/`, {
        old_password: oldPwd, new_password: newPwd, new_password_confirm: confPwd,
      })
      setSuccess(true)
      setOldPwd(''); setNewPwd(''); setConfPwd('')
      setTimeout(() => setSuccess(false), 4000)
    } catch (e) {
      const data = e.response?.data
      setError(data && typeof data === 'object' ? Object.values(data).flat().join(' — ') : 'Erreur lors du changement de mot de passe.')
    } finally { setSaving(false) }
  }

  return (
    <AppLayout topbar={<TopBar title="Mon profil" />}>
      <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100%' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ── Carte profil ── */}
          <div style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            {/* Header vert */}
            <div style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)', padding: '28px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', fontWeight: '700', color: '#fff', letterSpacing: '0.05em', flexShrink: 0,
                fontFamily: FONT,
              }}>
                {initials}
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#fff', fontFamily: FONT }}>
                  {user?.first_name} {user?.last_name}
                </div>
                <div style={{ marginTop: '6px' }}>
                  <span style={{ background: roleStyle.bg, color: roleStyle.color, fontSize: '11.5px', padding: '3px 10px', borderRadius: '6px', fontWeight: '500', fontFamily: FONT }}>
                    {roleStyle.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Infos */}
            <div style={{ padding: '4px 24px 8px' }}>
              <InfoRow label="Email" value={user?.email} />
              <InfoRow label="Département" value={user?.department_detail?.name ?? 'Non défini'} />
              <InfoRow label="Membre depuis" value={user?.date_joined ? new Date(user.date_joined).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'} />
            </div>
          </div>

          {/* ── Changer le mot de passe ── */}
          <div style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: '600', color: '#111827', fontFamily: FONT }}>
              Changer mon mot de passe
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Mot de passe actuel</label>
                <input type="password" className="form-input" value={oldPwd} onChange={e => setOldPwd(e.target.value)} placeholder="••••••••"/>
              </div>
              <div>
                <label className="form-label">Nouveau mot de passe</label>
                <input type="password" className="form-input" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Minimum 8 caractères"/>
              </div>
              <div>
                <label className="form-label">Confirmer le nouveau mot de passe</label>
                <input type="password" className="form-input" value={confPwd} onChange={e => setConfPwd(e.target.value)} placeholder="Répéter le mot de passe"/>
              </div>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#991b1b', fontFamily: FONT, marginTop: '14px' }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#166534', fontFamily: FONT, marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Mot de passe modifié avec succès.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn-primary" onClick={handleChangePassword} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Mettre à jour'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  )
}
