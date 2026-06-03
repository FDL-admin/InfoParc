import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'

const FONT = "'Inter', system-ui, sans-serif"

const TYPE_OPTIONS = [
  { value: 'desktop', label: 'Desktop' }, { value: 'laptop',  label: 'Laptop' },
  { value: 'printer', label: 'Imprimante' }, { value: 'scanner', label: 'Scanner' },
  { value: 'server',  label: 'Serveur' }, { value: 'network', label: 'Réseau' },
  { value: 'phone',   label: 'Téléphone' }, { value: 'other',   label: 'Autre' },
]
const STATUS_OPTIONS = [
  { value: 'active',  label: 'Actif' }, { value: 'stock',   label: 'En stock' },
  { value: 'repair',  label: 'En réparation' }, { value: 'broken',  label: 'En panne' },
  { value: 'retired', label: 'Mis au rebut' },
]
const SITE_OPTIONS = [
  { value: 'bobo', label: 'Bobo-Dioulasso' }, { value: 'ouaga', label: 'Ouagadougou' },
]

function F({ label, required, error, col, children }) {
  return (
    <div style={{ gridColumn: col }}>
      <label className="form-label">{label}{required && <span className="required">*</span>}</label>
      {children}
      {error && <p style={{ fontSize:'12px', color:'#dc2626', marginTop:'4px', fontFamily: FONT }}>{error}</p>}
    </div>
  )
}

export default function EquipmentEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [departments, setDepartments] = useState([])
  const [suppliers,   setSuppliers]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [errors,      setErrors]      = useState({})
  const [globalErr,   setGlobalErr]   = useState('')

  const [form, setForm] = useState({
    name:'', type:'desktop', brand:'', model:'', serial_number:'',
    status:'stock', site:'bobo', department:'', supplier:'',
    purchase_date:'', purchase_price:'', warranty_end_date:'',
    lifespan_years:'', location:'', notes:'',
  })

  useEffect(() => {
    Promise.all([api.get(`/equipment/${id}/`), api.get('/departments/'), api.get('/suppliers/')])
      .then(([eqR, dR, sR]) => {
        const eq = eqR.data
        setForm({
          name: eq.name ?? '', type: eq.type ?? 'desktop',
          brand: eq.brand ?? '', model: eq.model ?? '',
          serial_number: eq.serial_number ?? '',
          status: eq.status ?? 'stock', site: eq.site ?? 'bobo',
          department: eq.department ? String(eq.department) : '',
          supplier: eq.supplier ? String(eq.supplier) : '',
          purchase_date: eq.purchase_date ?? '',
          purchase_price: eq.purchase_price ? String(eq.purchase_price) : '',
          warranty_end_date: eq.warranty_end_date ?? '',
          lifespan_years: eq.lifespan_years ? String(eq.lifespan_years) : '',
          location: eq.location ?? '', notes: eq.notes ?? '',
        })
        setDepartments(dR.data.results ?? dR.data)
        setSuppliers(sR.data.results ?? sR.data)
      })
      .catch(() => navigate(`/equipment/${id}`))
      .finally(() => setLoading(false))
  }, [id])

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => { const n={...p}; delete n[k]; return n }) }

  const handleSubmit = async () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Obligatoire'
    if (Object.keys(e).length) { setErrors(e); return }

    setSaving(true); setGlobalErr('')
    try {
      const p = { name: form.name, type: form.type, status: form.status, site: form.site }
      if (form.brand)             p.brand             = form.brand
      if (form.model)             p.model             = form.model
      if (form.serial_number)     p.serial_number     = form.serial_number
      if (form.department)        p.department        = parseInt(form.department)
      if (form.supplier)          p.supplier          = parseInt(form.supplier)
      if (form.purchase_date)     p.purchase_date     = form.purchase_date
      if (form.purchase_price)    p.purchase_price    = form.purchase_price
      if (form.warranty_end_date) p.warranty_end_date = form.warranty_end_date
      if (form.lifespan_years)    p.lifespan_years    = parseInt(form.lifespan_years)
      if (form.location)          p.location          = form.location
      if (form.notes)             p.notes             = form.notes
      await api.patch(`/equipment/${id}/`, p)
      navigate(`/equipment/${id}`)
    } catch (err) {
      const d = err.response?.data
      if (d && typeof d === 'object') {
        const fe={}, gl=[]
        Object.entries(d).forEach(([k,v])=>{ const m=Array.isArray(v)?v.join(', '):String(v); if(k in form) fe[k]=m; else gl.push(m) })
        setErrors(fe); if(gl.length) setGlobalErr(gl.join(' — '))
      } else { setGlobalErr('Erreur lors de la modification.') }
      setSaving(false)
    }
  }

  if (loading) return <AppLayout><div style={{ padding:'2rem', color:'#1B5E20', fontFamily: FONT }}>Chargement…</div></AppLayout>

  return (
    <AppLayout topbar={
      <TopBar title={
        <span style={{ display:'flex', alignItems:'center', gap:'8px', fontFamily: FONT }}>
          <button onClick={() => navigate(`/equipment/${id}`)} style={{ background:'none', border:'none', cursor:'pointer', color:'#6b7280', display:'flex', alignItems:'center', gap:'4px', fontSize:'13px', fontFamily: FONT }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Équipement
          </button>
          <span style={{ color:'#d1d5db' }}>/</span>
          <span style={{ color:'#111827', fontWeight:'500' }}>Modifier</span>
        </span>
      }/>
    }>
      <div style={{ padding:'24px', background:'#f8f9fa', minHeight:'100%' }}>
        <div style={{ maxWidth:'760px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'16px' }}>

          <div style={{ background:'#fff', border:'1px solid #eaecf0', borderRadius:'12px', padding:'24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h2 style={{ margin:'0 0 20px', fontSize:'15px', fontWeight:'600', color:'#111827', fontFamily: FONT }}>Modifier l'équipement</h2>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'14px 16px' }}>
              <F label="Nom" required error={errors.name} col="1 / 3">
                <input className={`form-input${errors.name?' error':''}`} value={form.name} onChange={e=>set('name',e.target.value)}/>
              </F>
              <F label="Statut">
                <select className="form-select" value={form.status} onChange={e=>set('status',e.target.value)}>
                  {STATUS_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </F>

              <F label="Type" required>
                <select className="form-select" value={form.type} onChange={e=>set('type',e.target.value)}>
                  {TYPE_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </F>
              <F label="Marque">
                <input className="form-input" value={form.brand} onChange={e=>set('brand',e.target.value)}/>
              </F>
              <F label="Modèle">
                <input className="form-input" value={form.model} onChange={e=>set('model',e.target.value)}/>
              </F>

              <F label="Numéro de série">
                <input className="form-input" value={form.serial_number} onChange={e=>set('serial_number',e.target.value)}/>
              </F>
              <F label="Site">
                <select className="form-select" value={form.site} onChange={e=>set('site',e.target.value)}>
                  {SITE_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </F>
              <F label="Localisation / IP">
                <input className="form-input" value={form.location} onChange={e=>set('location',e.target.value)}/>
              </F>

              <F label="Département" col="1 / 3">
                <select className="form-select" value={form.department} onChange={e=>set('department',e.target.value)}>
                  <option value="">— Aucun —</option>
                  {departments.map(d=><option key={d.id} value={String(d.id)}>{d.name}</option>)}
                </select>
              </F>
              <F label="Fournisseur">
                <select className="form-select" value={form.supplier} onChange={e=>set('supplier',e.target.value)}>
                  <option value="">— Aucun —</option>
                  {suppliers.map(s=><option key={s.id} value={String(s.id)}>{s.name}</option>)}
                </select>
              </F>

              <F label="Date d'achat">
                <input type="date" className="form-input" value={form.purchase_date} onChange={e=>set('purchase_date',e.target.value)}/>
              </F>
              <F label="Prix d'achat (FCFA)">
                <input type="number" min="0" className="form-input" value={form.purchase_price} onChange={e=>set('purchase_price',e.target.value)}/>
              </F>
              <F label="Fin de garantie">
                <input type="date" className="form-input" value={form.warranty_end_date} onChange={e=>set('warranty_end_date',e.target.value)}/>
              </F>

              <F label="Durée de vie (années)">
                <input type="number" min="0" className="form-input" value={form.lifespan_years} onChange={e=>set('lifespan_years',e.target.value)}/>
              </F>

              <F label="Notes" col="1 / -1">
                <textarea className="form-textarea" style={{ minHeight:'68px' }} value={form.notes} onChange={e=>set('notes',e.target.value)}/>
              </F>
            </div>
          </div>

          {globalErr && (
            <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:'10px', padding:'12px 16px', fontSize:'13px', color:'#991b1b', fontFamily: FONT }}>
              {globalErr}
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px' }}>
            <button className="btn-secondary" onClick={() => navigate(`/equipment/${id}`)}>Annuler</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
