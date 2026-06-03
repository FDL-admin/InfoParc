import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'

const FONT = "'Inter', system-ui, sans-serif"

const TYPE_OPTIONS = [
  { value: 'warranty',    label: 'Garantie' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'support',     label: 'Support' },
  { value: 'lease',       label: 'Leasing' },
  { value: 'other',       label: 'Autre' },
]

const STATUS_MAP = {
  active:    { bg: '#dcfce7', color: '#166534', label: 'Actif' },
  expired:   { bg: '#fee2e2', color: '#991b1b', label: 'Expiré' },
  pending:   { bg: '#fef3c7', color: '#92400e', label: 'En attente' },
  cancelled: { bg: '#f3f4f6', color: '#6b7280', label: 'Résilié' },
}

function F({ label, required, error, col, children }) {
  return (
    <div style={{ gridColumn: col }}>
      <label className="form-label">{label}{required && <span className="required">*</span>}</label>
      {children}
      {error && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', fontFamily: FONT }}>{error}</p>}
    </div>
  )
}

function daysUntil(d) { return Math.ceil((new Date(d) - new Date()) / 86400000) }

export default function ContractDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [equipment, setEquipment] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [errors,    setErrors]    = useState({})
  const [globalErr, setGlobalErr] = useState('')
  const [saved,     setSaved]     = useState(false)
  const [contractStatus, setContractStatus] = useState('')

  const [form, setForm] = useState({
    name: '', type: 'warranty', reference: '',
    equipment: '', supplier: '',
    start_date: '', end_date: '', alert_days: '30',
    amount: '', notes: '',
  })

  useEffect(() => {
    Promise.all([
      api.get(`/contracts/${id}/`),
      api.get('/equipment/?page_size=200'),
      api.get('/suppliers/'),
    ])
      .then(([cR, eR, sR]) => {
        const c = cR.data
        setContractStatus(c.status)
        setForm({
          name:       c.name       ?? '',
          type:       c.type       ?? 'warranty',
          reference:  c.reference  ?? '',
          equipment:  c.equipment  ? String(c.equipment)  : '',
          supplier:   c.supplier   ? String(c.supplier)   : '',
          start_date: c.start_date ?? '',
          end_date:   c.end_date   ?? '',
          alert_days: c.alert_days ? String(c.alert_days) : '30',
          amount:     c.amount     ? String(c.amount)     : '',
          notes:      c.notes      ?? '',
        })
        setEquipment(eR.data.results ?? eR.data)
        setSuppliers(sR.data.results ?? sR.data)
      })
      .catch(() => navigate('/contracts'))
      .finally(() => setLoading(false))
  }, [id])

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => { const n = { ...p }; delete n[k]; return n })
    setSaved(false)
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())  e.name       = 'Obligatoire'
    if (!form.equipment)    e.equipment  = 'Obligatoire'
    if (!form.start_date)   e.start_date = 'Obligatoire'
    if (!form.end_date)     e.end_date   = 'Obligatoire'
    if (form.start_date && form.end_date && new Date(form.end_date) <= new Date(form.start_date))
                            e.end_date   = 'Doit être après le début'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true); setGlobalErr(''); setSaved(false)
    try {
      const p = {
        name: form.name, type: form.type,
        equipment: parseInt(form.equipment),
        start_date: form.start_date, end_date: form.end_date,
        alert_days: parseInt(form.alert_days) || 30,
      }
      if (form.supplier)  p.supplier  = parseInt(form.supplier)
      if (form.reference) p.reference = form.reference
      if (form.amount)    p.amount    = form.amount
      p.notes = form.notes
      await api.patch(`/contracts/${id}/`, p)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      const d = err.response?.data
      if (d && typeof d === 'object') {
        const fe = {}, gl = []
        Object.entries(d).forEach(([k, v]) => { const m = Array.isArray(v) ? v.join(', ') : String(v); if (k in form) fe[k] = m; else gl.push(m) })
        setErrors(fe); if (gl.length) setGlobalErr(gl.join(' — '))
      } else { setGlobalErr('Erreur lors de la modification.') }
    } finally { setSaving(false) }
  }

  if (loading) return <AppLayout><div style={{ padding: '2rem', color: '#1B5E20', fontFamily: FONT }}>Chargement…</div></AppLayout>

  const days    = form.end_date ? daysUntil(form.end_date) : null
  const expired = days !== null && days < 0
  const urgent  = days !== null && days >= 0 && days <= 30
  const statusInfo = STATUS_MAP[contractStatus] ?? { bg: '#f3f4f6', color: '#6b7280', label: contractStatus }

  return (
    <AppLayout topbar={
      <TopBar
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: FONT }}>
            <button onClick={() => navigate('/contracts')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontFamily: FONT }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Contrats
            </button>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span style={{ color: '#111827', fontWeight: '500', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.name || '—'}</span>
          </span>
        }
      />
    }>
      <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100%' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Bandeau statut + expiration */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <span style={{ background: statusInfo.bg, color: statusInfo.color, fontSize: '12px', padding: '4px 12px', borderRadius: '7px', fontWeight: '500', fontFamily: FONT }}>
              {statusInfo.label}
            </span>
            {days !== null && (
              <span style={{
                fontSize: '12.5px', fontWeight: '600', fontFamily: FONT,
                color: expired ? '#dc2626' : urgent ? '#d97706' : '#6b7280',
              }}>
                {expired ? `Expiré il y a ${Math.abs(days)} j` : urgent ? `⚠ Expire dans ${days} j` : `${days} j restants`}
              </span>
            )}
          </div>

          {/* Formulaire */}
          <div style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 16px' }}>

              <F label="Nom du contrat" required error={errors.name} col="1 / -1">
                <input className={`form-input${errors.name ? ' error' : ''}`} value={form.name} onChange={e => set('name', e.target.value)}/>
              </F>

              <F label="Type">
                <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                  {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </F>
              <F label="Référence">
                <input className="form-input" value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="REF-2026-001"/>
              </F>
              <F label="Alerte (jours avant fin)">
                <input type="number" min="0" className="form-input" value={form.alert_days} onChange={e => set('alert_days', e.target.value)}/>
              </F>

              <F label="Équipement" required error={errors.equipment} col="1 / 3">
                <select className={`form-select${errors.equipment ? ' error' : ''}`} value={form.equipment} onChange={e => set('equipment', e.target.value)}>
                  <option value="">— Sélectionner un équipement —</option>
                  {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}{eq.serial_number ? ` · ${eq.serial_number}` : ''}</option>)}
                </select>
              </F>
              <F label="Fournisseur">
                <select className="form-select" value={form.supplier} onChange={e => set('supplier', e.target.value)}>
                  <option value="">— Aucun —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </F>

              <F label="Date de début" required error={errors.start_date}>
                <input type="date" className={`form-input${errors.start_date ? ' error' : ''}`} value={form.start_date} onChange={e => set('start_date', e.target.value)}/>
              </F>
              <F label="Date de fin" required error={errors.end_date}>
                <input type="date" className={`form-input${errors.end_date ? ' error' : ''}`} value={form.end_date} onChange={e => set('end_date', e.target.value)}/>
              </F>
              <F label="Montant (FCFA)">
                <input type="number" min="0" className="form-input" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0"/>
              </F>

              <F label="Notes" col="1 / -1">
                <textarea className="form-textarea" style={{ minHeight: '72px' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Informations complémentaires…"/>
              </F>
            </div>
          </div>

          {globalErr && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#991b1b', fontFamily: FONT }}>
              {globalErr}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
            {saved && (
              <span style={{ fontSize: '13px', color: '#16a34a', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Modifications enregistrées
              </span>
            )}
            <button className="btn-secondary" onClick={() => navigate('/contracts')}>Retour</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>

        </div>
      </div>
    </AppLayout>
  )
}
