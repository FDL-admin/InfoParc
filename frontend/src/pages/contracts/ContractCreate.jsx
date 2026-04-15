import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'

const TYPE_OPTIONS = [
  { value: 'warranty',    label: 'Garantie' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'support',     label: 'Support' },
  { value: 'lease',       label: 'Leasing' },
  { value: 'other',       label: 'Autre' },
]

export default function ContractCreate() {
  const navigate = useNavigate()

  const [equipment, setEquipment] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    type: 'warranty',
    equipment: '',
    supplier: '',
    start_date: '',
    end_date: '',
    alert_days: '30',
    reference: '',
    amount: '',
    notes: '',
  })

  useEffect(() => {
    api.get('/equipment/?status=active')
      .then(res => setEquipment(res.data.results ?? res.data))
      .catch(() => {})
    api.get('/suppliers/')
      .then(res => setSuppliers(res.data.results ?? res.data))
      .catch(() => {})
  }, [])

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Le nom du contrat est obligatoire.')
      return
    }
    if (!form.equipment) {
      setError("L'équipement est obligatoire.")
      return
    }
    if (!form.start_date || !form.end_date) {
      setError('Les dates de début et de fin sont obligatoires.')
      return
    }
    if (new Date(form.end_date) <= new Date(form.start_date)) {
      setError('La date de fin doit être postérieure à la date de début.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name,
        type: form.type,
        equipment: parseInt(form.equipment),
        start_date: form.start_date,
        end_date: form.end_date,
        alert_days: form.alert_days ? parseInt(form.alert_days) : 30,
      }
      if (form.supplier)  payload.supplier  = parseInt(form.supplier)
      if (form.reference) payload.reference = form.reference
      if (form.amount)    payload.amount    = form.amount
      if (form.notes)     payload.notes     = form.notes

      await api.post('/contracts/', payload)
      navigate('/contracts')
    } catch (e) {
      const data = e.response?.data
      if (data && typeof data === 'object') {
        const msgs = Object.entries(data)
          .map(([k, v]) => `${k} : ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' — ')
        setError(msgs)
      } else {
        setError('Erreur lors de la création. Vérifiez les champs et réessayez.')
      }
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

  return (
    <AppLayout topbar={
      <TopBar
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => navigate('/contracts')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#888', fontSize: '13px', padding: 0,
              }}
            >
              ← Retour
            </button>
            <span style={{ color: '#ccc' }}>|</span>
            Nouveau contrat
          </span>
        }
      />
    }>

      <div style={{ padding: '24px', maxWidth: '720px', margin: '0 auto' }}>
        <div style={{
          background: '#fff', border: '0.5px solid #e0e0e0',
          borderRadius: '8px', padding: '28px',
        }}>

          <div style={{
            fontSize: '15px', fontWeight: '600', color: '#1B5E20',
            marginBottom: '24px', paddingBottom: '12px',
            borderBottom: '1px solid #f0f0f0',
          }}>
            Informations du contrat
          </div>

          {/* Nom */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Nom du contrat *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              style={inputStyle}
              placeholder="ex : Contrat maintenance HP 2026"
            />
          </div>

          {/* Type + Référence */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Type</label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                style={inputStyle}
              >
                {TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Référence</label>
              <input
                value={form.reference}
                onChange={e => set('reference', e.target.value)}
                style={inputStyle}
                placeholder="ex : REF-2026-001"
              />
            </div>
          </div>

          {/* Équipement */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Équipement *</label>
            <select
              value={form.equipment}
              onChange={e => set('equipment', e.target.value)}
              style={inputStyle}
            >
              <option value="">— Sélectionner un équipement —</option>
              {equipment.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}{eq.serial_number ? ` (${eq.serial_number})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Fournisseur */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Fournisseur</label>
            <select
              value={form.supplier}
              onChange={e => set('supplier', e.target.value)}
              style={inputStyle}
            >
              <option value="">— Aucun —</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Date de début *</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Date de fin *</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => set('end_date', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Alerte + Montant */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Alerte avant expiration (jours)</label>
              <input
                type="number"
                min="0"
                value={form.alert_days}
                onChange={e => set('alert_days', e.target.value)}
                style={inputStyle}
                placeholder="30"
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Montant (FCFA)</label>
              <input
                type="number"
                min="0"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                style={inputStyle}
                placeholder="ex : 500000"
              />
            </div>
          </div>

          {/* Notes */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: '1.5' }}
              placeholder="Informations complémentaires..."
            />
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
              onClick={() => navigate('/contracts')}
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
              {saving ? 'Enregistrement...' : 'Créer le contrat'}
            </button>
          </div>

        </div>
      </div>
    </AppLayout>
  )
}
