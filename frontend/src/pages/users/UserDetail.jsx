import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

const ROLE_MAP = {
  user:       { bg: '#E6F1FB', color: '#185FA5', label: 'Utilisateur' },
  admin:      { bg: '#EEEDFE', color: '#3C3489', label: 'Admin' },
  superadmin: { bg: '#EAF3DE', color: '#27500A', label: 'Super Admin' },
}

function Badge({ value, map }) {
  const s = map[value] ?? { bg: '#F1EFE8', color: '#444441', label: value }
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: '12px', padding: '3px 9px',
      borderRadius: '4px', fontWeight: '500',
    }}>
      {s.label}
    </span>
  )
}

function ResetPasswordModal({ userId, onClose }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async () => {
    if (!newPassword.trim() || !confirm.trim()) {
      setError('Tous les champs sont obligatoires.')
      return
    }
    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (newPassword !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post(`/users/${userId}/change_password/`, {
        new_password: newPassword,
        new_password_confirm: confirm,
      })
      setSuccess('Mot de passe réinitialisé avec succès.')
      setTimeout(onClose, 1500)
    } catch (e) {
      const data = e.response?.data
      if (data && typeof data === 'object') {
        setError(Object.values(data).flat().join(' — '))
      } else {
        setError('Erreur lors de la réinitialisation.')
      }
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px', fontSize: '13px',
    border: '0.5px solid #ddd', borderRadius: '6px',
    outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = {
    fontSize: '11px', color: '#666', fontWeight: '500',
    display: 'block', marginBottom: '4px',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: '10px', width: '400px',
        padding: '28px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <div style={{
          fontSize: '15px', fontWeight: '600', color: '#1B5E20',
          marginBottom: '20px',
        }}>
          Réinitialiser le mot de passe
        </div>

        {success ? (
          <div style={{
            background: '#EAF3DE', color: '#27500A',
            borderRadius: '6px', padding: '10px 14px',
            fontSize: '13px',
          }}>
            {success}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Nouveau mot de passe *</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={inputStyle}
                placeholder="Minimum 8 caractères"
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Confirmer le mot de passe *</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                style={inputStyle}
                placeholder="Confirmer"
              />
            </div>

            {error && (
              <div style={{
                background: '#FCEBEB', color: '#791F1F',
                border: '0.5px solid #F09595',
                borderRadius: '4px', padding: '8px 12px',
                fontSize: '12px', marginBottom: '14px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 18px', borderRadius: '6px', fontSize: '13px',
                  border: '0.5px solid #ccc', background: '#fff',
                  color: '#666', cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                style={{
                  padding: '8px 20px', borderRadius: '6px', fontSize: '13px',
                  border: 'none',
                  background: saving ? '#81C784' : '#1B5E20',
                  color: '#fff',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                }}
              >
                {saving ? 'Enregistrement...' : 'Réinitialiser'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: me } = useAuth()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingRole, setEditingRole] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isAdmin = me?.role === 'admin' || me?.role === 'superadmin'
  const isSuperAdmin = me?.role === 'superadmin'

  const fetchUser = () => {
    api.get(`/users/${id}/`)
      .then(res => {
        setUser(res.data)
        setNewRole(res.data.role)
      })
      .catch(() => navigate('/users'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUser() }, [id])

  const handleRoleChange = async () => {
    try {
      await api.patch(`/users/${id}/`, { role: newRole })
      setEditingRole(false)
      setSuccess('Rôle modifié avec succès.')
      setTimeout(() => setSuccess(''), 3000)
      fetchUser()
    } catch (e) {
      const data = e.response?.data
      setError(data?.detail ?? 'Erreur lors du changement de rôle.')
    }
  }

  const handleToggleActive = async () => {
    const action = user.is_active ? 'désactiver' : 'activer'
    if (!confirm(`Voulez-vous ${action} cet utilisateur ?`)) return
    try {
      await api.post(`/users/${id}/toggle_active/`)
      setSuccess(`Utilisateur ${user.is_active ? 'désactivé' : 'activé'} avec succès.`)
      setTimeout(() => setSuccess(''), 3000)
      fetchUser()
    } catch {
      setError('Erreur lors de la modification.')
    }
  }

  const handleDelete = async () => {
    if (!confirm(
      `Supprimer définitivement ${user.first_name} ${user.last_name} ?\nCette action est irréversible.`
    )) return
    try {
      await api.delete(`/users/${id}/`)
      navigate('/users')
    } catch {
      setError('Erreur lors de la suppression.')
    }
  }

  if (loading) return (
    <AppLayout>
      <div style={{ padding: '2rem', color: '#1B5E20' }}>Chargement...</div>
    </AppLayout>
  )

  const selectStyle = {
    padding: '6px 10px', fontSize: '13px',
    border: '0.5px solid #ccc', borderRadius: '6px',
    outline: 'none', background: '#fff', fontFamily: 'inherit',
  }

  const actionBtn = (opts) => ({
    padding: '7px 14px', borderRadius: '6px', fontSize: '12px',
    cursor: 'pointer', ...opts,
  })

  return (
    <AppLayout topbar={
      <TopBar
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => navigate('/users')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#888', fontSize: '13px', padding: 0,
              }}
            >
              ← Retour
            </button>
            <span style={{ color: '#ccc' }}>|</span>
            {user.first_name} {user.last_name}
          </span>
        }
      />
    }>
      <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>

        {success && (
          <div style={{
            background: '#EAF3DE', color: '#27500A',
            border: '0.5px solid #A5D6A7',
            borderRadius: '6px', padding: '10px 14px',
            fontSize: '13px', marginBottom: '16px',
          }}>
            {success}
          </div>
        )}

        {error && (
          <div style={{
            background: '#FCEBEB', color: '#791F1F',
            border: '0.5px solid #F09595',
            borderRadius: '6px', padding: '10px 14px',
            fontSize: '13px', marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        <div style={{
          background: '#fff', border: '0.5px solid #e0e0e0',
          borderRadius: '8px', padding: '28px',
        }}>
          {/* Avatar + identité */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '20px',
            marginBottom: '24px', paddingBottom: '20px',
            borderBottom: '0.5px solid #f0f0f0',
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#C2185B', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '22px',
              fontWeight: '500', color: '#fff', flexShrink: 0,
            }}>
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#222', marginBottom: '4px' }}>
                {user.first_name} {user.last_name}
              </div>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                {user.email}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge value={user.role} map={ROLE_MAP} />
                <span style={{
                  fontSize: '11px', padding: '2px 7px', borderRadius: '4px',
                  background: user.is_active ? '#EAF3DE' : '#FCEBEB',
                  color: user.is_active ? '#27500A' : '#791F1F',
                  fontWeight: '500',
                }}>
                  {user.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          </div>

          {/* Détails */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '20px', marginBottom: '24px',
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Département</div>
              <div style={{ fontSize: '13px', color: '#333' }}>
                {user.department_detail?.name ?? '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Membre depuis</div>
              <div style={{ fontSize: '13px', color: '#333' }}>
                {new Date(user.date_joined).toLocaleDateString('fr-FR')}
              </div>
            </div>
          </div>

          {/* Actions admin — on ne peut pas s'auto-gérer ici */}
          {isAdmin && me?.id !== parseInt(id) && (
            <div style={{
              borderTop: '0.5px solid #f0f0f0', paddingTop: '20px',
            }}>
              <div style={{
                fontSize: '11px', fontWeight: '600', color: '#888',
                textTransform: 'uppercase', letterSpacing: '.04em',
                marginBottom: '12px',
              }}>
                Actions d'administration
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>

                {/* Changer le rôle */}
                {editingRole ? (
                  <>
                    <select
                      value={newRole}
                      onChange={e => setNewRole(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="user">Utilisateur</option>
                      {isSuperAdmin && <option value="admin">Admin</option>}
                      {isSuperAdmin && <option value="superadmin">Super Admin</option>}
                    </select>
                    <button
                      onClick={handleRoleChange}
                      style={actionBtn({
                        border: 'none', background: '#1B5E20', color: '#fff',
                      })}
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={() => { setEditingRole(false); setNewRole(user.role) }}
                      style={actionBtn({
                        border: '0.5px solid #ccc', background: '#fff', color: '#666',
                      })}
                    >
                      Annuler
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditingRole(true)}
                    style={actionBtn({
                      border: '0.5px solid #1B5E20', color: '#1B5E20', background: '#fff',
                    })}
                  >
                    Changer le rôle
                  </button>
                )}

                <button
                  onClick={() => setShowPasswordModal(true)}
                  style={actionBtn({
                    border: '0.5px solid #185FA5', color: '#185FA5', background: '#fff',
                  })}
                >
                  Réinitialiser mot de passe
                </button>

                <button
                  onClick={handleToggleActive}
                  style={actionBtn({
                    border: `0.5px solid ${user.is_active ? '#E24B4A' : '#2E7D32'}`,
                    color: user.is_active ? '#791F1F' : '#27500A',
                    background: '#fff',
                  })}
                >
                  {user.is_active ? 'Désactiver' : 'Activer'}
                </button>

                {isSuperAdmin && (
                  <button
                    onClick={handleDelete}
                    style={actionBtn({
                      border: 'none', background: '#E24B4A', color: '#fff',
                    })}
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showPasswordModal && (
        <ResetPasswordModal
          userId={id}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
    </AppLayout>
  )
}
