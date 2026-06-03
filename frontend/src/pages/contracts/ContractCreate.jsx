import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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

function F({ label, required, error, col, children }) {
  return (
    <div style={{ gridColumn: col }}>
      <label className="form-label">
        {label}{required && <span className="required">*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', fontFamily: FONT }}>{error}</p>}
    </div>
  )
}

export default function ContractCreate() {
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [globalErr, setGlobalErr] = useState('')

  const [form, setForm] = useState({
    name: '', type: 'warranty', reference: '',
    equipment: '', supplier: '',
    start_date: '', end_date: '', alert_days: '30',
    amount: '', notes: '',
  })

  useEffect(() => {
    api.get('/equipment/?status=active&page_size=200').then(r => setEquipment(r.data.results ?? r.data)).catch(() => {})
    api.get('/suppliers/').then(r => setSuppliers(r.data.results ?? r.data)).catch(() => {})
  }, [])

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => { const n={...p}; delete n[k]; return n }) }

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

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true); setGlobalErr('')
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
      if (form.notes)     p.notes     = form.notes
      await api.post('/contracts/', p)
      navigate('/contracts')
    } catch (err) {
      const d = err.response?.data
      if (d && typeof d === 'object') {
        const fe={}, gl=[]
        Object.entries(d).forEach(([k,v]) => { const m=Array.isArray(v)?v.join(', '):String(v); if(k in form) fe[k]=m; else gl.push(m) })
        setErrors(fe); if(gl.length) setGlobalErr(gl.join(' — '))
      } else { setGlobalErr('Erreur lors de la création.') }
      setSaving(false)
    }
  }

  return (
    <AppLayout topbar={
      <TopBar title={
        <span style={{ display:'flex', alignItems:'center', gap:'8px', fontFamily: FONT }}>
          <button onClick={() => navigate('/contracts')} style={{ background:'none', border:'none', cursor:'pointer', color:'#6b7280', display:'flex', alignItems:'center', gap:'4px', fontSize:'13px', fontFamily: FONT }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Contrats
          </button>
          <span style={{ color:'#d1d5db' }}>/</span>
          <span style={{ color:'#111827', fontWeight:'500' }}>Nouveau contrat</span>
        </span>
      }/>
    }>
      <div style={{ padding:'24px', background:'#f8f9fa', minHeight:'100%' }}>
        <div style={{ maxWidth:'700px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'16px' }}>

          <div style={{ background:'#fff', border:'1px solid #eaecf0', borderRadius:'12px', padding:'24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h2 style={{ margin:'0 0 20px', fontSize:'15px', fontWeight:'600', color:'#111827', fontFamily: FONT }}>Nouveau contrat</h2>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'14px 16px' }}>

              {/* Nom — pleine largeur */}
              <F label="Nom du contrat" required error={errors.name} col="1 / -1">
                <input className={`form-input${errors.name?' error':''}`} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="ex : Maintenance serveur HP 2026" autoFocus/>
              </F>

              {/* Type */}
              <F label="Type">
                <select className="form-select" value={form.type} onChange={e=>set('type',e.target.value)}>
                  {TYPE_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </F>

              {/* Référence */}
              <F label="Référence">
                <input className="form-input" value={form.reference} onChange={e=>set('reference',e.target.value)} placeholder="ex : REF-2026-001"/>
              </F>

              {/* Alerte */}
              <F label="Alerte (jours avant fin)">
                <input type="number" min="0" className="form-input" value={form.alert_days} onChange={e=>set('alert_days',e.target.value)} placeholder="30"/>
              </F>

              {/* Équipement — 2 colonnes */}
              <F label="Équipement" required error={errors.equipment} col="1 / 3">
                <select className={`form-select${errors.equipment?' error':''}`} value={form.equipment} onChange={e=>set('equipment',e.target.value)}>
                  <option value="">— Sélectionner un équipement —</option>
                  {equipment.map(eq=><option key={eq.id} value={eq.id}>{eq.name}{eq.serial_number?` · ${eq.serial_number}`:''}</option>)}
                </select>
              </F>

              {/* Fournisseur */}
              <F label="Fournisseur">
                <select className="form-select" value={form.supplier} onChange={e=>set('supplier',e.target.value)}>
                  <option value="">— Aucun —</option>
                  {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </F>

              {/* Dates + Montant */}
              <F label="Date de début" required error={errors.start_date}>
                <input type="date" className={`form-input${errors.start_date?' error':''}`} value={form.start_date} onChange={e=>set('start_date',e.target.value)}/>
              </F>
              <F label="Date de fin" required error={errors.end_date}>
                <input type="date" className={`form-input${errors.end_date?' error':''}`} value={form.end_date} onChange={e=>set('end_date',e.target.value)}/>
              </F>
              <F label="Montant (FCFA)">
                <input type="number" min="0" className="form-input" value={form.amount} onChange={e=>set('amount',e.target.value)} placeholder="0"/>
              </F>

              {/* Notes — pleine largeur */}
              <F label="Notes" col="1 / -1">
                <textarea className="form-textarea" style={{ minHeight:'72px' }} value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Informations complémentaires..."/>
              </F>
            </div>
          </div>

          {globalErr && (
            <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:'10px', padding:'12px 16px', fontSize:'13px', color:'#991b1b', fontFamily: FONT }}>
              {globalErr}
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px' }}>
            <button className="btn-secondary" onClick={() => navigate('/contracts')}>Annuler</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Créer le contrat'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
