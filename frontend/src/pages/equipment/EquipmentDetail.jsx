import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { useDialog } from '../../context/DialogContext'

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
const STATUS_MAP = {
  active:  { bg: '#dcfce7', color: '#166534', label: 'Actif' },
  broken:  { bg: '#fee2e2', color: '#991b1b', label: 'En panne' },
  repair:  { bg: '#fef3c7', color: '#92400e', label: 'En réparation' },
  retired: { bg: '#f3f4f6', color: '#6b7280', label: 'Mis au rebut' },
  stock:   { bg: '#e0f2fe', color: '#075985', label: 'En stock' },
}

// ── Champ formulaire ──────────────────────────────────────────
function F({ label, required, error, col, children }) {
  return (
    <div style={{ gridColumn: col }}>
      <label className="form-label">{label}{required && <span className="required">*</span>}</label>
      {children}
      {error && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', fontFamily: FONT }}>{error}</p>}
    </div>
  )
}

// ── Card section droite ───────────────────────────────────────
function RCard({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', fontSize: '13px', fontWeight: '600', color: '#111827', fontFamily: FONT }}>{title}</div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}

export default function EquipmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'
  const { confirm, toast } = useDialog()

  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [errors,      setErrors]      = useState({})
  const [globalErr,   setGlobalErr]   = useState('')

  const [departments, setDepartments] = useState([])
  const [suppliers,   setSuppliers]   = useState([])
  const [allUsers,    setAllUsers]    = useState([])
  const [history,     setHistory]     = useState([])

  // Données live (avatar, tickets, etc.)
  const [eqData,      setEqData]      = useState(null)

  // Formulaire modifiable
  const [form, setForm] = useState({
    name: '', type: 'desktop', brand: '', model: '', serial_number: '',
    status: 'stock', site: 'bobo', department: '', supplier: '',
    purchase_date: '', purchase_price: '', warranty_end_date: '',
    lifespan_years: '', location: '', notes: '',
  })

  // Affectation
  const [assignForm,  setAssignForm]  = useState({ user: '', date_start: new Date().toISOString().split('T')[0], notes: '' })
  const [assignErr,   setAssignErr]   = useState('')
  const [assigning,   setAssigning]   = useState(false)

  const reload = () => {
    Promise.all([
      api.get(`/equipment/${id}/`),
      api.get(`/equipment/${id}/history/`),
      api.get('/departments/'),
      api.get('/suppliers/'),
      api.get('/users/'),
    ])
      .then(([eR, hR, dR, sR, uR]) => {
        const eq = eR.data
        setEqData(eq)
        setHistory(hR.data)
        setDepartments(dR.data.results ?? dR.data)
        setSuppliers(sR.data.results ?? sR.data)
        setAllUsers(uR.data.results ?? uR.data)
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
      })
      .catch(() => navigate('/equipment'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [id])

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => { const n={...p}; delete n[k]; return n }); setSaved(false) }

  const handleSave = async () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Obligatoire'
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true); setGlobalErr(''); setSaved(false)
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
      p.notes = form.notes
      await api.patch(`/equipment/${id}/`, p)
      setSaved(true); setTimeout(() => setSaved(false), 3000)
      setEqData(prev => ({ ...prev, ...p }))
    } catch (err) {
      const d = err.response?.data
      if (d && typeof d === 'object') {
        const fe={}, gl=[]
        Object.entries(d).forEach(([k,v])=>{ const m=Array.isArray(v)?v.join(', '):String(v); if(k in form) fe[k]=m; else gl.push(m) })
        setErrors(fe); if(gl.length) setGlobalErr(gl.join(' — '))
      } else { setGlobalErr('Erreur lors de la modification.') }
    } finally { setSaving(false) }
  }

  const handleAssign = async () => {
    if (!assignForm.user || !assignForm.date_start) { setAssignErr('Utilisateur et date obligatoires.'); return }
    setAssigning(true); setAssignErr('')
    try {
      await api.post(`/equipment/${id}/assign/`, { user: parseInt(assignForm.user), date_start: assignForm.date_start, notes: assignForm.notes })
      reload()
      setAssignForm({ user: '', date_start: new Date().toISOString().split('T')[0], notes: '' })
    } catch (e) {
      const d = e.response?.data
      setAssignErr(d && typeof d === 'object' ? Object.values(d).flat().join(' — ') : "Erreur lors de l'affectation.")
    } finally { setAssigning(false) }
  }

  const handleUnassign = async () => {
    const ok = await confirm({ title: 'Désaffecter', message: 'Retirer l\'affectation de cet équipement ?', variant: 'danger', confirmLabel: 'Désaffecter' })
    if (!ok) return
    try { await api.post(`/equipment/${id}/unassign/`); reload() }
    catch { toast({ title: 'Erreur', message: 'Erreur lors de la désaffectation.', variant: 'danger' }) }
  }

  if (loading) return <AppLayout><div style={{ padding: '2rem', color: '#1B5E20', fontFamily: FONT }}>Chargement…</div></AppLayout>
  if (!eqData) return null

  const warrantyDays = eqData.warranty_end_date
    ? Math.ceil((new Date(eqData.warranty_end_date) - new Date()) / 86400000)
    : null

  const statusStyle = STATUS_MAP[form.status] ?? STATUS_MAP.stock

  return (
    <AppLayout topbar={
      <TopBar
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: FONT }}>
            <button onClick={() => navigate('/equipment')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontFamily: FONT }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Équipements
            </button>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span style={{ color: '#111827', fontWeight: '500' }}>{eqData.name}</span>
          </span>
        }
        actions={
          eqData.assigned_to && isAdmin ? (
            <button className="btn-danger" onClick={handleUnassign}>Désaffecter</button>
          ) : null
        }
      />
    }>

      <div style={{ padding: '20px 24px', background: '#f8f9fa', minHeight: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', alignItems: 'start' }}>

          {/* ── Colonne gauche : formulaire modifiable ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#111827', fontFamily: FONT }}>Informations</h2>
                <span style={{ background: statusStyle.bg, color: statusStyle.color, fontSize: '12px', padding: '2px 9px', borderRadius: '6px', fontWeight: '500', fontFamily: FONT }}>
                  {statusStyle.label}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 16px' }}>
                <F label="Nom" required error={errors.name} col="1 / 3">
                  <input className={`form-input${errors.name ? ' error' : ''}`} value={form.name} onChange={e => set('name', e.target.value)}/>
                </F>
                <F label="Statut">
                  <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </F>

                <F label="Type" required>
                  <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                    {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </F>
                <F label="Marque">
                  <input className="form-input" value={form.brand} onChange={e => set('brand', e.target.value)}/>
                </F>
                <F label="Modèle">
                  <input className="form-input" value={form.model} onChange={e => set('model', e.target.value)}/>
                </F>

                <F label="Numéro de série">
                  <input className="form-input" value={form.serial_number} onChange={e => set('serial_number', e.target.value)}/>
                </F>
                <F label="Site">
                  <select className="form-select" value={form.site} onChange={e => set('site', e.target.value)}>
                    {SITE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </F>
                <F label="Localisation / IP">
                  <input className="form-input" value={form.location} onChange={e => set('location', e.target.value)}/>
                </F>

                <F label="Département" col="1 / 3">
                  <select className="form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                    <option value="">— Aucun —</option>
                    {departments.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                  </select>
                </F>
                <F label="Fournisseur">
                  <select className="form-select" value={form.supplier} onChange={e => set('supplier', e.target.value)}>
                    <option value="">— Aucun —</option>
                    {suppliers.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                  </select>
                </F>

                <F label="Date d'achat">
                  <input type="date" className="form-input" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)}/>
                </F>
                <F label="Prix d'achat (FCFA)">
                  <input type="number" min="0" className="form-input" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)}/>
                </F>
                <F label="Fin de garantie">
                  <input type="date" className="form-input" value={form.warranty_end_date} onChange={e => set('warranty_end_date', e.target.value)}/>
                  {warrantyDays !== null && (
                    <p style={{ fontSize: '11.5px', marginTop: '4px', fontFamily: FONT, color: warrantyDays < 0 ? '#dc2626' : warrantyDays <= 60 ? '#d97706' : '#9ca3af' }}>
                      {warrantyDays < 0 ? `Expirée il y a ${Math.abs(warrantyDays)}j` : `Expire dans ${warrantyDays}j`}
                    </p>
                  )}
                </F>

                <F label="Durée de vie (années)">
                  <input type="number" min="0" className="form-input" value={form.lifespan_years} onChange={e => set('lifespan_years', e.target.value)}/>
                </F>

                <F label="Notes" col="1 / -1">
                  <textarea className="form-textarea" style={{ minHeight: '68px' }} value={form.notes} onChange={e => set('notes', e.target.value)}/>
                </F>
              </div>

              {globalErr && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#991b1b', fontFamily: FONT, marginTop: '16px' }}>
                  {globalErr}
                </div>
              )}

              {isAdmin && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                  {saved && (
                    <span style={{ fontSize: '13px', color: '#16a34a', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Enregistré
                    </span>
                  )}
                  <button className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
              )}
            </div>

            {/* Historique affectations */}
            <div style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontSize: '13px', fontWeight: '600', color: '#111827', fontFamily: FONT }}>
                Historique des affectations ({history.length})
              </div>
              {history.length === 0 ? (
                <div style={{ padding: '20px', fontSize: '13px', color: '#9ca3af', fontStyle: 'italic', fontFamily: FONT }}>Aucune affectation enregistrée</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Utilisateur', 'Début', 'Fin', 'Statut'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', color: '#9ca3af', fontWeight: '600', borderBottom: '1px solid #f3f4f6', textTransform: 'uppercase', letterSpacing: '.06em', background: '#fafafa', fontFamily: FONT }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id}>
                        <td style={{ padding: '11px 16px', borderBottom: '1px solid #f9fafb', fontSize: '13px', fontWeight: '500', color: '#111827', fontFamily: FONT }}>{h.user_detail?.first_name} {h.user_detail?.last_name}</td>
                        <td style={{ padding: '11px 16px', borderBottom: '1px solid #f9fafb', fontSize: '12.5px', color: '#6b7280', fontFamily: FONT }}>{new Date(h.date_start).toLocaleDateString('fr-FR')}</td>
                        <td style={{ padding: '11px 16px', borderBottom: '1px solid #f9fafb', fontSize: '12.5px', color: '#6b7280', fontFamily: FONT }}>
                          {h.date_end ? new Date(h.date_end).toLocaleDateString('fr-FR') : <span style={{ color: '#16a34a', fontWeight: '500' }}>En cours</span>}
                        </td>
                        <td style={{ padding: '11px 16px', borderBottom: '1px solid #f9fafb', fontFamily: FONT }}>
                          <span style={{ fontSize: '11.5px', padding: '2px 8px', borderRadius: '5px', fontWeight: '500', background: h.date_end ? '#f3f4f6' : '#dcfce7', color: h.date_end ? '#6b7280' : '#166534' }}>
                            {h.date_end ? 'Terminée' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── Colonne droite ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Affectation actuelle */}
            <RCard title="Affectation actuelle">
              {eqData.assigned_to_detail ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', color: '#374151', flexShrink: 0 }}>
                    {eqData.assigned_to_detail.first_name?.[0]}{eqData.assigned_to_detail.last_name?.[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: '500', color: '#111827', fontFamily: FONT }}>{eqData.assigned_to_detail.first_name} {eqData.assigned_to_detail.last_name}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px', fontFamily: FONT }}>{eqData.assigned_to_detail.email}</div>
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic', fontFamily: FONT }}>Non affecté</span>
              )}
            </RCard>

            {/* Formulaire affectation */}
            {isAdmin && eqData.status !== 'retired' && (
              <RCard title="Affecter à un utilisateur">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label className="form-label">Utilisateur<span className="required">*</span></label>
                    <select className="form-select" value={assignForm.user} onChange={e => setAssignForm(f => ({ ...f, user: e.target.value }))}>
                      <option value="">— Sélectionner —</option>
                      {allUsers.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}{u.department_detail?.name ? ` — ${u.department_detail.name}` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Date de début<span className="required">*</span></label>
                    <input type="date" className="form-input" value={assignForm.date_start} onChange={e => setAssignForm(f => ({ ...f, date_start: e.target.value }))}/>
                  </div>
                  <div>
                    <label className="form-label">Notes</label>
                    <input className="form-input" value={assignForm.notes} onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes…"/>
                  </div>
                  {assignErr && <p style={{ fontSize: '12px', color: '#dc2626', fontFamily: FONT }}>{assignErr}</p>}
                  <button className="btn-primary" onClick={handleAssign} disabled={assigning} style={{ width: '100%', justifyContent: 'center' }}>
                    {assigning ? 'Affectation…' : 'Affecter'}
                  </button>
                </div>
              </RCard>
            )}

            {/* Achat & Garantie */}
            <RCard title="Achat & Garantie">
              {[
                ['Date d\'achat', eqData.purchase_date ? new Date(eqData.purchase_date).toLocaleDateString('fr-FR') : null],
                ['Prix d\'achat', eqData.purchase_price ? `${Number(eqData.purchase_price).toLocaleString('fr-FR')} FCFA` : null],
                ['Fournisseur', eqData.supplier_detail?.name],
                ['Durée de vie', eqData.lifespan_years ? `${eqData.lifespan_years} an${eqData.lifespan_years > 1 ? 's' : ''}` : null],
              ].map(([label, value]) => value ? (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f9fafb', fontFamily: FONT }}>
                  <span style={{ fontSize: '12.5px', color: '#6b7280' }}>{label}</span>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>{value}</span>
                </div>
              ) : null)}
              {eqData.warranty_end_date && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontFamily: FONT }}>
                  <span style={{ fontSize: '12.5px', color: '#6b7280' }}>Fin garantie</span>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: warrantyDays < 0 ? '#dc2626' : warrantyDays <= 60 ? '#d97706' : '#111827' }}>
                    {new Date(eqData.warranty_end_date).toLocaleDateString('fr-FR')}
                    <span style={{ fontSize: '11px', fontWeight: '400', marginLeft: '5px', color: '#9ca3af' }}>
                      ({warrantyDays < 0 ? `-${Math.abs(warrantyDays)}j` : `+${warrantyDays}j`})
                    </span>
                  </span>
                </div>
              )}
            </RCard>

          </div>
        </div>
      </div>
    </AppLayout>
  )
}
