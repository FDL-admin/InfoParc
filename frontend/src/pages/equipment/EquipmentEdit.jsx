import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'

const TYPE_OPTIONS = [
  { value: 'desktop',  label: 'Desktop' },
  { value: 'laptop',   label: 'Laptop' },
  { value: 'printer',  label: 'Imprimante' },
  { value: 'scanner',  label: 'Scanner' },
  { value: 'server',   label: 'Serveur' },
  { value: 'network',  label: 'Réseau' },
  { value: 'phone',    label: 'Téléphone' },
  { value: 'other',    label: 'Autre' },
]

const STATUS_OPTIONS = [
  { value: 'active',  label: 'Actif' },
  { value: 'stock',   label: 'En stock' },
  { value: 'repair',  label: 'En réparation' },
  { value: 'broken',  label: 'En panne' },
  { value: 'retired', label: 'Mis au rebut' },
]

const SITE_OPTIONS = [
  { value: 'bobo',  label: 'Bobo-Dioulasso' },
  { value: 'ouaga', label: 'Ouagadougou' },
]

export default function EquipmentEdit() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [departments, setDepartments] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    type: 'desktop',
    brand: '',
    model: '',
    serial_number: '',
    status: 'stock',
    site: 'bobo',
    department: '',
    supplier: '',
    purchase_date: '',
    purchase_price: '',
    warranty_end_date: '',
    lifespan_years: '',
    location: '',
    notes: '',
  })

  useEffect(() => {
    Promise.all([
      api.get(`/equipment/${id}/`),
      api.get('/departments/'),
      api.get('/suppliers/'),
    ])
      .then(([eqRes, deptRes, suppRes]) => {
        const eq = eqRes.data
        setForm({
          name:             eq.name             ?? '',
          type:             eq.type             ?? 'desktop',
          brand:            eq.brand            ?? '',
          model:            eq.model            ?? '',
          serial_number:    eq.serial_number    ?? '',
          status:           eq.status           ?? 'stock',
          site:             eq.site             ?? 'bobo',
          department:       eq.department       ? String(eq.department) : '',
          supplier:         eq.supplier         ? String(eq.supplier)   : '',
          purchase_date:    eq.purchase_date    ?? '',
          purchase_price:   eq.purchase_price   ? String(eq.purchase_price) : '',
          warranty_end_date: eq.warranty_end_date ?? '',
          lifespan_years:   eq.lifespan_years   ? String(eq.lifespan_years) : '',
          location:         eq.location         ?? '',
          notes:            eq.notes            ?? '',
        })
        setDepartments(deptRes.data.results ?? deptRes.data)
        setSuppliers(suppRes.data.results ?? suppRes.data)
      })
      .catch(() => navigate(`/equipment/${id}`))
      .finally(() => setLoading(false))
  }, [id])

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("Le nom de l'équipement est obligatoire.")
      return
    }

    setSaving(true)
    setError('')
    try {
      const payload = {
        name:   form.name,
        type:   form.type,
        status: form.status,
        site:   form.site,
      }
      if (form.brand)             payload.brand             = form.brand
      if (form.model)             payload.model             = form.model
      if (form.serial_number)     payload.serial_number     = form.serial_number
      if (form.department)        payload.department        = parseInt(form.department)
      if (form.supplier)          payload.supplier          = parseInt(form.supplier)
      if (form.purchase_date)     payload.purchase_date     = form.purchase_date
      if (form.purchase_price)    payload.purchase_price    = form.purchase_price
      if (form.warranty_end_date) payload.warranty_end_date = form.warranty_end_date
      if (form.lifespan_years)    payload.lifespan_years    = parseInt(form.lifespan_years)
      if (form.location)          payload.location          = form.location
      if (form.notes)             payload.notes             = form.notes

      await api.patch(`/equipment/${id}/`, payload)
      navigate(`/equipment/${id}`)
    } catch (e) {
      const data = e.response?.data
      if (data && typeof data === 'object') {
        const msgs = Object.entries(data)
          .map(([k, v]) => `${k} : ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' — ')
        setError(msgs)
      } else {
        setError('Erreur lors de la modification. Vérifiez les champs et réessayez.')
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
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }

  if (loading) return (
    <AppLayout>
      <div style={{ padding: '2rem', color: '#1B5E20' }}>Chargement...</div>
    </AppLayout>
  )

  return (
    <AppLayout topbar={
      <TopBar
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => navigate(`/equipment/${id}`)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#888', fontSize: '13px', padding: 0,
              }}
            >
              ← Retour
            </button>
            <span style={{ color: '#ccc' }}>|</span>
            Modifier l'équipement
          </span>
        }
      />
    }>

      <div style={{ padding: '24px', maxWidth: '760px', margin: '0 auto' }}>
        <div style={{
          background: '#fff', border: '0.5px solid #e0e0e0',
          borderRadius: '8px', padding: '28px',
        }}>

          <div style={{
            fontSize: '15px', fontWeight: '600', color: '#1B5E20',
            marginBottom: '24px', paddingBottom: '12px',
            borderBottom: '1px solid #f0f0f0',
          }}>
            Informations de l'équipement
          </div>

          {/* Nom */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Nom *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Type + Statut */}
          <div style={grid2}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Type *</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} style={inputStyle}>
                {TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Statut</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} style={inputStyle}>
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Marque + Modèle */}
          <div style={grid2}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Marque</label>
              <input
                value={form.brand}
                onChange={e => set('brand', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Modèle</label>
              <input
                value={form.model}
                onChange={e => set('model', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Numéro de série + Site */}
          <div style={grid2}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Numéro de série</label>
              <input
                value={form.serial_number}
                onChange={e => set('serial_number', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Site</label>
              <select value={form.site} onChange={e => set('site', e.target.value)} style={inputStyle}>
                {SITE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Département + Fournisseur */}
          <div style={grid2}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Département</label>
              <select value={form.department} onChange={e => set('department', e.target.value)} style={inputStyle}>
                <option value="">— Aucun —</option>
                {departments.map(d => (
                  <option key={d.id} value={String(d.id)}>{d.name}</option>
                ))}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Fournisseur</label>
              <select value={form.supplier} onChange={e => set('supplier', e.target.value)} style={inputStyle}>
                <option value="">— Aucun —</option>
                {suppliers.map(s => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date d'achat + Prix */}
          <div style={grid2}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Date d'achat</label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={e => set('purchase_date', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Prix d'achat (FCFA)</label>
              <input
                type="number"
                min="0"
                value={form.purchase_price}
                onChange={e => set('purchase_price', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Fin de garantie + Durée de vie */}
          <div style={grid2}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Fin de garantie</label>
              <input
                type="date"
                value={form.warranty_end_date}
                onChange={e => set('warranty_end_date', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Durée de vie (années)</label>
              <input
                type="number"
                min="0"
                value={form.lifespan_years}
                onChange={e => set('lifespan_years', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Localisation */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Localisation / IP</label>
            <input
              value={form.location}
              onChange={e => set('location', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Notes */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: '1.5' }}
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
              onClick={() => navigate(`/equipment/${id}`)}
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
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>

        </div>
      </div>
    </AppLayout>
  )
}
