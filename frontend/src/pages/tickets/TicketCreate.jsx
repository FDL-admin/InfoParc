import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

const CATEGORY_MAP = {
  hardware: 'Panne matérielle',
  software: 'Logiciel',
  network:  'Réseau',
  printer:  'Imprimante',
  other:    'Autre',
}

const PRIORITY_MAP = {
  low:      'Basse',
  normal:   'Normale',
  high:     'Haute',
  critical: 'Critique',
}

export default function TicketCreate() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [equipment, setEquipment] = useState([])
  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    observations: '',
    category: 'other',
    priority: 'normal',
    equipment: '',
    assigned_to: '',
  })

  useEffect(() => {
    api.get('/equipment/?status=active')
      .then(res => setEquipment(res.data.results ?? res.data))
      .catch(() => {})
    api.get('/users/')
      .then(res => setUsers(res.data.results ?? res.data))
      .catch(() => {})
  }, [])

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setError('La désignation et les défauts signalés sont obligatoires.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        title: form.title,
        description: form.description,
        observations: form.observations,
        category: form.category,
        priority: form.priority,
      }
      if (form.equipment) payload.equipment = parseInt(form.equipment)
      if (form.assigned_to) payload.assigned_to = parseInt(form.assigned_to)

      const res = await api.post('/tickets/', payload)
      navigate(`/tickets/${res.data.id}`)
    } catch {
      setError('Erreur lors de la création. Vérifiez les champs et réessayez.')
      setSaving(false)
    }
  }

  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  const cellStyle = {
    border: '1px solid #bbb',
    padding: '10px',
    verticalAlign: 'top',
  }

  const inputStyle = {
    width: '100%', padding: '6px 8px', fontSize: '13px',
    border: '0.5px solid #ccc', borderRadius: '4px',
    outline: 'none', background: '#fff', fontFamily: 'inherit',
  }

  const textareaStyle = {
    ...inputStyle,
    resize: 'vertical',
    minHeight: '100px',
    lineHeight: '1.5',
  }

  return (
    <AppLayout topbar={
      <TopBar
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => navigate('/tickets')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#888', fontSize: '13px', padding: 0,
              }}
            >
              ← Retour
            </button>
            <span style={{ color: '#ccc' }}>|</span>
            Nouvelle demande d'intervention
          </span>
        }
      />
    }>

      <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>

        {/* Document officiel */}
        <div style={{
          background: '#fff', border: '1px solid #ccc',
          borderRadius: '4px', padding: '28px 32px',
          fontFamily: 'Arial, sans-serif',
        }}>

          {/* En-tête */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #1B5E20',
            paddingBottom: '14px', marginBottom: '20px',
          }}>
            <img
              src="/logo.png"
              alt="BUMIGEB"
              style={{ width: '70px', height: '70px', objectFit: 'contain' }}
            />
              <div>
                <div style={{
                  fontSize: '11px', color: '#C2185B',
                  fontWeight: '700', letterSpacing: '.05em',
                  marginBottom: '4px',
                }}>
                  PROCESSUS GÉRER LE SYSTÈME D'INFORMATION
                </div>
                <div style={{
                  fontSize: '18px', fontWeight: '700', color: '#1B5E20',
                }}>
                  Demande d'intervention SI
                </div>
              </div>
            </div>
            <div style={{
              border: '1px solid #555', padding: '8px 12px',
              fontSize: '12px', lineHeight: '2',
            }}>
              <div><strong>Référence :</strong> BUMIGEB/PS-SI/FO01</div>
              <div><strong>Version :</strong> V04</div>
              <div><strong>Date :</strong> 05/03/2024</div>
            </div>
          </div>

          {/* N° DI + Date */}
          <div style={{
            display: 'flex', gap: '32px',
            marginBottom: '20px', fontSize: '13px', fontWeight: '700',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              DEMANDE D'INTERVENTION (DI) N°
              <span style={{
                display: 'inline-block', minWidth: '140px',
                borderBottom: '1px solid #555', padding: '2px 4px',
                color: '#888', fontWeight: '400', fontSize: '12px',
                fontStyle: 'italic',
              }}>
                Généré automatiquement
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              DATE
              <span style={{
                fontWeight: '400', fontSize: '12px', color: '#333',
              }}>
                {today}
              </span>
            </div>
          </div>

          {/* Service demandeur / Bénéficiaire */}
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            marginBottom: '16px', fontSize: '13px',
          }}>
            <tbody>
              <tr>
                <td style={{
                  ...cellStyle, width: '200px',
                  fontWeight: '700', background: '#f5f5f5',
                  fontSize: '12px',
                }}>
                  SERVICE DEMANDEUR
                </td>
                <td style={cellStyle}>
                  <div style={{
                    fontSize: '13px', color: '#333', fontWeight: '500',
                  }}>
                    {user?.department?.name ?? '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                    {user?.first_name} {user?.last_name}
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{
                  ...cellStyle,
                  fontWeight: '700', background: '#f5f5f5',
                  fontSize: '12px',
                }}>
                  BÉNÉFICIAIRE
                </td>
                <td style={cellStyle}>
                  <select
                    value={form.assigned_to}
                    onChange={e => set('assigned_to', e.target.value)}
                    style={{ ...inputStyle, border: 'none', fontSize: '13px', padding: '2px 0' }}
                  >
                    <option value="">— Sélectionner un bénéficiaire (optionnel) —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                        {u.department?.name ? ` — ${u.department.name}` : ''}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Tableau principal */}
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            marginBottom: '20px', fontSize: '13px',
          }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                {[
                  ['DÉSIGNATION', '30%'],
                  ['CODE MATÉRIEL', '20%'],
                  ['DÉFAUTS SIGNALÉS', '25%'],
                  ['OBSERVATIONS', '25%'],
                ].map(([h, w]) => (
                  <th key={h} style={{
                    ...cellStyle, width: w,
                    fontWeight: '700', fontSize: '12px',
                    textAlign: 'left',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...cellStyle, verticalAlign: 'top' }}>
                  <textarea
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    placeholder="Nature de la panne ou du besoin d'intervention..."
                    style={{ ...textareaStyle, border: 'none' }}
                  />
                </td>
                <td style={{ ...cellStyle, verticalAlign: 'top' }}>
                  <select
                    value={form.equipment}
                    onChange={e => set('equipment', e.target.value)}
                    style={{
                      ...inputStyle, border: 'none',
                      fontSize: '12px', padding: '4px 0',
                    }}
                  >
                    <option value="">— Sélectionner —</option>
                    {equipment.map(eq => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name}
                        {eq.serial_number ? ` (${eq.serial_number})` : ''}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ ...cellStyle, verticalAlign: 'top' }}>
                  <textarea
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder="Décrire les défauts constatés..."
                    style={{ ...textareaStyle, border: 'none' }}
                  />
                </td>
                <td style={{ ...cellStyle, verticalAlign: 'top' }}>
                  <textarea
                    value={form.observations}
                    onChange={e => set('observations', e.target.value)}
                    placeholder="Observations complémentaires..."
                    style={{ ...textareaStyle, border: 'none' }}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/* Catégorie + Priorité */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '16px', marginBottom: '20px',
          }}>
            <div>
              <label style={{
                fontSize: '11px', fontWeight: '700', color: '#1B5E20',
                textTransform: 'uppercase', letterSpacing: '.04em',
                display: 'block', marginBottom: '6px',
              }}>
                Catégorie
              </label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                style={inputStyle}
              >
                {Object.entries(CATEGORY_MAP).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{
                fontSize: '11px', fontWeight: '700', color: '#1B5E20',
                textTransform: 'uppercase', letterSpacing: '.04em',
                display: 'block', marginBottom: '6px',
              }}>
                Niveau de priorité
              </label>
              <select
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
                style={inputStyle}
              >
                {Object.entries(PRIORITY_MAP).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section services techniques */}
          <div style={{
            border: '1px solid #bbb', marginBottom: '20px',
          }}>
            <div style={{
              textAlign: 'center', fontWeight: '700', fontSize: '12px',
              padding: '8px', background: '#f5f5f5',
              borderBottom: '1px solid #bbb',
              textDecoration: 'underline', letterSpacing: '.04em',
            }}>
              RÉSERVÉ AUX SERVICES TECHNIQUES
            </div>
            <div style={{ padding: '10px 14px', fontSize: '12px', color: '#777' }}>
              <div style={{ marginBottom: '6px' }}>
                <strong style={{ color: '#444' }}>Nom et prénom de l'intervenant :</strong>
                <em> Renseigné automatiquement lors de l'ajout d'une intervention</em>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ color: '#444' }}>Date et heure de réception :</strong>
                <em> Horodatage automatique à la création</em>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{
                      ...cellStyle, width: '50%',
                      color: '#aaa', fontSize: '12px', minHeight: '60px',
                    }}>
                      <strong style={{ color: '#777' }}>TRAVAUX À EFFECTUER</strong><br />
                      <em style={{ fontSize: '11px' }}>
                        À compléter par le technicien via la page du ticket
                      </em>
                    </td>
                    <td style={{
                      ...cellStyle, color: '#aaa', fontSize: '12px',
                    }}>
                      <strong style={{ color: '#777' }}>MATÉRIELS À FOURNIR</strong><br />
                      <em style={{ fontSize: '11px' }}>
                        À compléter par le technicien via la page du ticket
                      </em>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section bénéficiaire */}
          <div style={{
            border: '1px solid #bbb', marginBottom: '24px',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '8px 14px', background: '#f5f5f5',
              borderBottom: '1px solid #bbb', fontSize: '12px',
            }}>
              <strong style={{ textDecoration: 'underline' }}>RÉSERVÉ AU BÉNÉFICIAIRE</strong>
              <strong>VISA DU BÉNÉFICIAIRE :</strong>
            </div>
            <div style={{ padding: '10px 14px', fontSize: '12px', color: '#aaa' }}>
              <em>
                Date et heure de fin d'intervention, satisfaction — à renseigner après résolution
              </em>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div style={{
              background: '#FCEBEB', color: '#791F1F',
              border: '0.5px solid #F09595',
              borderRadius: '4px', padding: '10px 14px',
              fontSize: '13px', marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          {/* Boutons */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end',
            gap: '10px', paddingTop: '8px',
            borderTop: '1px solid #eee',
          }}>
            <button
              onClick={() => navigate('/tickets')}
              style={{
                padding: '9px 22px', borderRadius: '4px', fontSize: '13px',
                border: '0.5px solid #bbb', background: '#fff',
                color: '#666', cursor: 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                padding: '9px 28px', borderRadius: '4px', fontSize: '13px',
                border: 'none',
                background: saving ? '#81C784' : '#1B5E20',
                color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: '500',
              }}
            >
              {saving ? 'Enregistrement...' : 'Soumettre la demande'}
            </button>
          </div>

        </div>
    </AppLayout>
  )
}