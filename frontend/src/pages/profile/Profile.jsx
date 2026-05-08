import { useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

const ROLE_MAP = {
  user:       { bg: '#E6F1FB', color: '#185FA5', label: 'Utilisateur' },
  admin:      { bg: '#EEEDFE', color: '#3C3489', label: 'Admin' },
  superadmin: { bg: '#EAF3DE', color: '#27500A', label: 'Super Admin' },
}

export default function Profile() {
  const { user } = useAuth()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Tous les champs sont obligatoires.')
      return
    }
    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await api.post(`/users/${user.id}/change_password/`, {
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      })
      setSuccess('Mot de passe modifié avec succès.')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e) {
      const data = e.response?.data
      if (data && typeof data === 'object') {
        setError(Object.values(data).flat().join(' — '))
      } else {
        setError('Erreur lors du changement de mot de passe.')
      }
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px', fontSize: '13px',
    border: '0.5px solid #ccc', borderRadius: '6px',
    outline: 'none', boxSizing: 'border-box', background: '#fff',
    fontFamily: 'inherit',
  }
  const labelStyle = {
    fontSize: '11px', color: '#666', fontWeight: '500',
    display: 'block', marginBottom: '4px',
  }
  const fieldStyle = { marginBottom: '16px' }

  const roleStyle = ROLE_MAP[user?.role] ?? { bg: '#F1EFE8', color: '#444441', label: user?.role }

  return (
    <AppLayout topbar={<TopBar title="Mon profil" />}>
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Infos personnelles */}
        <div style={{
          background: '#fff', border: '0.5px solid #e0e0e0',
          borderRadius: '8px', padding: '24px',
          marginBottom: '16px',
        }}>
          <div style={{
            fontSize: '13px', fontWeight: '500', color: '#1B5E20',
            marginBottom: '16px', paddingBottom: '10px',
            borderBottom: '0.5px solid #f0f0f0',
          }}>
            Informations personnelles
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            marginBottom: '20px',
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: '#C2185B', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '18px',
              fontWeight: '500', color: '#fff', flexShrink: 0,
            }}>
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#222', marginBottom: '6px' }}>
                {user?.first_name} {user?.last_name}
              </div>
              <span style={{
                background: roleStyle.bg, color: roleStyle.color,
                fontSize: '11px', padding: '2px 7px',
                borderRadius: '4px', fontWeight: '500',
              }}>
                {roleStyle.label}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Email</div>
              <div style={{ fontSize: '13px', color: '#333' }}>{user?.email}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Département</div>
              <div style={{ fontSize: '13px', color: '#333' }}>
                {user?.department_detail?.name ?? 'Non défini'}
              </div>
            </div>
          </div>
        </div>

        {/* Changer le mot de passe */}
        <div style={{
          background: '#fff', border: '0.5px solid #e0e0e0',
          borderRadius: '8px', padding: '24px',
        }}>
          <div style={{
            fontSize: '13px', fontWeight: '500', color: '#1B5E20',
            marginBottom: '16px', paddingBottom: '10px',
            borderBottom: '0.5px solid #f0f0f0',
          }}>
            Changer mon mot de passe
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Mot de passe actuel</label>
            <input
              type="password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={inputStyle}
              placeholder="Minimum 8 caractères"
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={inputStyle}
              placeholder="Confirmer"
            />
          </div>

          {error && (
            <div style={{
              background: '#FCEBEB', color: '#791F1F',
              border: '0.5px solid #F09595',
              borderRadius: '4px', padding: '10px 14px',
              fontSize: '13px', marginBottom: '14px',
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              background: '#EAF3DE', color: '#27500A',
              border: '0.5px solid #A5D6A7',
              borderRadius: '4px', padding: '10px 14px',
              fontSize: '13px', marginBottom: '14px',
            }}>
              {success}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleChangePassword}
              disabled={saving}
              style={{
                padding: '9px 24px', borderRadius: '6px', fontSize: '13px',
                border: 'none',
                background: saving ? '#81C784' : '#1B5E20',
                color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: '500',
              }}
            >
              {saving ? 'Enregistrement...' : 'Mettre à jour le mot de passe'}
            </button>
          </div>
        </div>

      </div>
    </AppLayout>
  )
}
