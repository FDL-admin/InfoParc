import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const EMPTY_FORM = {
  first_name: '', last_name: '', email: '',
  password: '', confirm_password: '', role: 'user', department: '',
}

function CreateUserModal({ onClose, onCreated, isSuperAdmin }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [departments, setDepartments] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/departments/')
      .then(res => setDepartments(res.data.results ?? res.data))
      .catch(() => {})
  }, [])

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const handleSubmit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.password.trim() || !form.confirm_password.trim()) {
      setError('Tous les champs obligatoires doivent être remplis.')
      return
    }
    if (form.password !== form.confirm_password) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { confirm_password, ...rest } = form
      const payload = { ...rest, password_confirm: confirm_password }
      if (!payload.department) delete payload.department
      await api.post('/users/', payload)
      onCreated()
    } catch (e) {
      console.log('Erreur détaillée:', e.response?.data) // ← ajoute cette ligne
      const data = e.response?.data
      if (data && typeof data === 'object') {
        const msgs = Object.entries(data)
          .map(([k, v]) => `${k} : ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' — ')
        setError(msgs)
      } else {
        setError('Erreur lors de la création.')
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
  const fieldStyle = { marginBottom: '14px' }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: '10px', width: '440px',
        padding: '28px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <div style={{
          fontSize: '15px', fontWeight: '600', color: '#1B5E20',
          marginBottom: '20px',
        }}>
          Nouvel utilisateur
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Prénom *</label>
            <input
              value={form.first_name}
              onChange={e => set('first_name', e.target.value)}
              style={inputStyle}
              placeholder="Prénom"
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Nom *</label>
            <input
              value={form.last_name}
              onChange={e => set('last_name', e.target.value)}
              style={inputStyle}
              placeholder="Nom"
            />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            style={inputStyle}
            placeholder="email@bumigeb.bf"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Mot de passe *</label>
            <input
              type="password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              style={inputStyle}
              placeholder="Mot de passe"
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Confirmer le mot de passe *</label>
            <input
              type="password"
              value={form.confirm_password}
              onChange={e => set('confirm_password', e.target.value)}
              style={inputStyle}
              placeholder="Confirmer"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Rôle</label>
            <select
              value={form.role}
              onChange={e => set('role', e.target.value)}
              style={inputStyle}
            >
              <option value="user">Utilisateur</option>
              {isSuperAdmin && <option value="admin">Admin</option>}
              {isSuperAdmin && <option value="superadmin">Super Admin</option>}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Département</label>
            <select
              value={form.department}
              onChange={e => set('department', e.target.value)}
              style={inputStyle}
            >
              <option value="">— Aucun —</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
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
            {saving ? 'Création...' : "Créer l'utilisateur"}
          </button>
        </div>
      </div>
    </div>
  )
}

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
      fontSize: '11px', padding: '2px 7px',
      borderRadius: '4px', fontWeight: '500',
    }}>
      {s.label}
    </span>
  )
}

function Avatar({ firstName, lastName }) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
  return (
    <div style={{
      width: '28px', height: '28px', borderRadius: '50%',
      background: '#C2185B', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: '11px', fontWeight: '500',
      color: '#fff', flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

export default function UserList() {
  const { user: me } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)

  const isSuperAdmin = me?.role === 'superadmin'

  const PAGE_SIZE = 20

  // Redirige si pas superadmin
  useEffect(() => {
    if (me && me.role !== 'superadmin') {
      navigate('/', { replace: true })
    }
  }, [me])

  const fetchUsers = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    params.append('page', page)

    api.get(`/users/?${params.toString()}`)
      .then(res => {
        setUsers(res.data.results ?? res.data)
        setCount(res.data.count ?? 0)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()
  }, [page])

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      fetchUsers()
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  const handleToggleActive = async (userId, currentState) => {
    const action = currentState ? 'désactiver' : 'activer'
    if (!confirm(`Voulez-vous ${action} cet utilisateur ?`)) return
    try {
      await api.post(`/users/${userId}/toggle_active/`)
      fetchUsers()
    } catch {
      alert('Erreur lors de la modification.')
    }
  }

  const totalPages = Math.ceil(count / PAGE_SIZE)

  return (
    <AppLayout topbar={
      <TopBar
        title="Utilisateurs"
        actions={
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: '#C2185B', color: '#fff', border: 'none',
              borderRadius: '6px', padding: '7px 14px',
              fontSize: '12px', cursor: 'pointer',
            }}
          >
            + Nouvel utilisateur
          </button>
        }
      />
    }>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Recherche */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: '#fff', border: '0.5px solid #e0e0e0',
          borderRadius: '6px', padding: '7px 12px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#aaa" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher par nom, email..."
            style={{
              border: 'none', outline: 'none', fontSize: '13px',
              color: '#333', flex: 1, background: 'transparent',
            }}
          />
        </div>

        {/* Tableau */}
        <div style={{
          background: '#fff', border: '0.5px solid #e0e0e0',
          borderRadius: '8px', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {['Utilisateur', 'Email', 'Département', 'Rôle', 'Statut', 'Actions'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '10px 12px',
                    color: '#888', fontWeight: '400',
                    borderBottom: '0.5px solid #eee', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>
                  Chargement...
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>
                  Aucun utilisateur trouvé
                </td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.id}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar firstName={u.first_name} lastName={u.last_name} />
                        <div>
                          <div style={{ fontWeight: '500', color: '#222' }}>
                            {u.first_name} {u.last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', color: '#666' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', color: '#666' }}>
                      {u.department?.name ?? '—'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5' }}>
                      <Badge value={u.role} map={ROLE_MAP} />
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5' }}>
                      <span style={{
                        fontSize: '11px', padding: '2px 7px', borderRadius: '4px',
                        background: u.is_active ? '#EAF3DE' : '#FCEBEB',
                        color: u.is_active ? '#27500A' : '#791F1F',
                        fontWeight: '500',
                      }}>
                        {u.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5' }}>
                      {/* Ne pas pouvoir se désactiver soi-même */}
                      {u.id !== me?.id && (
                        <button
                          onClick={() => handleToggleActive(u.id, u.is_active)}
                          style={{
                            padding: '4px 10px', borderRadius: '4px', fontSize: '11px',
                            border: '0.5px solid',
                            borderColor: u.is_active ? '#E24B4A' : '#2E7D32',
                            color: u.is_active ? '#791F1F' : '#27500A',
                            background: '#fff', cursor: 'pointer',
                          }}
                        >
                          {u.is_active ? 'Désactiver' : 'Activer'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '5px 10px', border: '0.5px solid #e0e0e0',
                borderRadius: '4px 0 0 4px', background: '#fff',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                color: page === 1 ? '#ccc' : '#666', fontSize: '12px',
              }}
            >←</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .map((n, idx, arr) => (
                <>
                  {idx > 0 && arr[idx - 1] !== n - 1 && (
                    <span key={`dots-${n}`} style={{ padding: '5px 8px', fontSize: '12px', color: '#aaa' }}>…</span>
                  )}
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    style={{
                      padding: '5px 10px', border: '0.5px solid #e0e0e0',
                      background: page === n ? '#1B5E20' : '#fff',
                      color: page === n ? '#fff' : '#666',
                      cursor: 'pointer', fontSize: '12px',
                    }}
                  >{n}</button>
                </>
              ))
            }
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: '5px 10px', border: '0.5px solid #e0e0e0',
                borderRadius: '0 4px 4px 0', background: '#fff',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                color: page === totalPages ? '#ccc' : '#666', fontSize: '12px',
              }}
            >→</button>
          </div>
        )}

        <div style={{ fontSize: '11px', color: '#aaa', textAlign: 'right' }}>
          {count} utilisateur{count > 1 ? 's' : ''} au total
        </div>

      </div>

      {showModal && (
        <CreateUserModal
          isSuperAdmin={isSuperAdmin}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchUsers() }}
        />
      )}
    </AppLayout>
  )
}