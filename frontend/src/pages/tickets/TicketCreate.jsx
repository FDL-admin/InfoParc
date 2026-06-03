import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

const FONT = "'Inter', system-ui, sans-serif"

const CATEGORIES = [
  { value: 'hardware', label: 'Panne matérielle' },
  { value: 'software', label: 'Logiciel' },
  { value: 'network',  label: 'Réseau' },
  { value: 'printer',  label: 'Imprimante' },
  { value: 'other',    label: 'Autre' },
]

const PRIORITIES = [
  { value: 'low',      label: 'Basse' },
  { value: 'normal',   label: 'Normale' },
  { value: 'high',     label: 'Haute' },
  { value: 'critical', label: 'Critique' },
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

export default function TicketCreate() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState([])
  const [users,     setUsers]     = useState([])
  const [saving,    setSaving]    = useState(false)
  const [errors,    setErrors]    = useState({})
  const [globalErr, setGlobalErr] = useState('')

  const [form, setForm] = useState({
    title: '', description: '', observations: '',
    category: 'other', priority: 'normal',
    equipment: '', assigned_to: '',
  })

  useEffect(() => {
    api.get('/equipment/?status=active&page_size=200').then(r => setEquipment(r.data.results ?? r.data)).catch(() => {})
    api.get('/users/').then(r => setUsers(r.data.results ?? r.data)).catch(() => {})
  }, [])

  useEffect(() => { if (user?.id) setForm(p => ({ ...p, assigned_to: user.id })) }, [user])

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => { const n={...p}; delete n[k]; return n }) }

  const handleSubmit = async () => {
    const e = {}
    if (!form.title.trim())       e.title       = 'La désignation est obligatoire.'
    if (!form.description.trim()) e.description = 'Les défauts signalés sont obligatoires.'
    if (Object.keys(e).length) { setErrors(e); return }

    setSaving(true); setGlobalErr('')
    try {
      const p = {
        title: form.title, description: form.description,
        observations: form.observations,
        category: form.category, priority: form.priority,
      }
      if (form.equipment)  p.equipment  = parseInt(form.equipment)
      if (form.assigned_to) p.assigned_to = parseInt(form.assigned_to)
      const res = await api.post('/tickets/', p)
      navigate(`/tickets/${res.data.id}`)
    } catch {
      setGlobalErr('Erreur lors de la création. Vérifiez les champs.')
      setSaving(false)
    }
  }

  const today = new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' })

  const cell = { border:'1px solid #d1d5db', padding:'10px 12px', verticalAlign:'top' }

  return (
    <AppLayout topbar={
      <TopBar title={
        <span style={{ display:'flex', alignItems:'center', gap:'8px', fontFamily: FONT }}>
          <button onClick={() => navigate('/tickets')} style={{ background:'none', border:'none', cursor:'pointer', color:'#6b7280', display:'flex', alignItems:'center', gap:'4px', fontSize:'13px', fontFamily: FONT }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Tickets
          </button>
          <span style={{ color:'#d1d5db' }}>/</span>
          <span style={{ color:'#111827', fontWeight:'500' }}>Nouvelle demande d'intervention</span>
        </span>
      }/>
    }>

      <div style={{ padding:'24px', background:'#f8f9fa', minHeight:'100%' }}>
        <div style={{ maxWidth:'900px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'16px' }}>

          {/* Document officiel */}
          <div style={{ background:'#fff', border:'1px solid #eaecf0', borderRadius:'12px', overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>

            {/* En-tête institutionnel */}
            <div style={{ padding:'20px 24px', borderBottom:'2px solid #1B5E20', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                <img src="/logo.png" alt="BUMIGEB" style={{ width:'56px', height:'56px', objectFit:'contain' }}/>
                <div>
                  <div style={{ fontSize:'10px', fontWeight:'700', color:'#C62828', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'3px', fontFamily: FONT }}>
                    Processus — Gérer le système d'information
                  </div>
                  <div style={{ fontSize:'17px', fontWeight:'700', color:'#1B5E20', fontFamily: FONT }}>
                    Demande d'intervention SI
                  </div>
                </div>
              </div>
              <div style={{ border:'1px solid #d1d5db', borderRadius:'8px', padding:'10px 14px', fontSize:'12px', lineHeight:'1.8', color:'#6b7280', fontFamily: FONT }}>
                <div><strong style={{ color:'#374151' }}>Réf :</strong> BUMIGEB/PS-SI/FO01</div>
                <div><strong style={{ color:'#374151' }}>Version :</strong> V04</div>
                <div><strong style={{ color:'#374151' }}>Date :</strong> 05/03/2024</div>
              </div>
            </div>

            <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:'16px' }}>

              {/* N° DI + Date */}
              <div style={{ display:'flex', alignItems:'center', gap:'24px', fontSize:'13px', fontWeight:'600', color:'#374151', fontFamily: FONT }}>
                <span>DI N° <span style={{ fontWeight:'400', color:'#9ca3af', fontStyle:'italic' }}>Généré automatiquement</span></span>
                <span>Date : <span style={{ fontWeight:'400', color:'#374151' }}>{today}</span></span>
              </div>

              {/* Service demandeur + Bénéficiaire */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div style={{ border:'1px solid #e5e7eb', borderRadius:'8px', padding:'12px', background:'#f9fafb' }}>
                  <div style={{ fontSize:'11px', fontWeight:'600', color:'#6b7280', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'6px', fontFamily: FONT }}>Service demandeur</div>
                  <div style={{ fontSize:'13.5px', fontWeight:'500', color:'#111827', fontFamily: FONT }}>{user?.department?.name ?? 'Non défini'}</div>
                  <div style={{ fontSize:'12px', color:'#9ca3af', marginTop:'2px', fontFamily: FONT }}>{user?.first_name} {user?.last_name}</div>
                </div>
                <F label="Bénéficiaire">
                  <select className="form-select" value={form.assigned_to} onChange={e=>set('assigned_to',e.target.value)}>
                    <option value="">— Optionnel —</option>
                    {users.map(u=><option key={u.id} value={u.id}>{u.first_name} {u.last_name}{u.department?.name?` — ${u.department.name}`:''}</option>)}
                  </select>
                </F>
              </div>

              {/* Tableau principal */}
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px', fontFamily: FONT }}>
                <thead>
                  <tr style={{ background:'#f9fafb' }}>
                    {[['Désignation / Objet', '30%'], ['Équipement concerné', '22%'], ['Défauts signalés', '28%'], ['Observations', '20%']].map(([h,w]) => (
                      <th key={h} style={{ ...cell, width:w, fontSize:'11px', fontWeight:'600', color:'#6b7280', textTransform:'uppercase', letterSpacing:'.06em', borderColor:'#d1d5db' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={cell}>
                      <textarea
                        className={`form-textarea${errors.title?' error':''}`}
                        style={{ border:'none', boxShadow:'none', padding:0, minHeight:'100px', resize:'vertical' }}
                        value={form.title}
                        onChange={e=>set('title',e.target.value)}
                        placeholder="Nature de la panne ou de l'intervention…"
                      />
                      {errors.title && <p style={{ fontSize:'12px', color:'#dc2626', margin:'4px 0 0', fontFamily: FONT }}>{errors.title}</p>}
                    </td>
                    <td style={cell}>
                      <select
                        className="form-select"
                        style={{ border:'none', boxShadow:'none', padding:'0 20px 0 0', background:'transparent' }}
                        value={form.equipment}
                        onChange={e=>set('equipment',e.target.value)}
                      >
                        <option value="">— Aucun —</option>
                        {equipment.map(eq=><option key={eq.id} value={eq.id}>{eq.name}{eq.serial_number?` (${eq.serial_number})`:''}</option>)}
                      </select>
                    </td>
                    <td style={cell}>
                      <textarea
                        className={`form-textarea${errors.description?' error':''}`}
                        style={{ border:'none', boxShadow:'none', padding:0, minHeight:'100px', resize:'vertical' }}
                        value={form.description}
                        onChange={e=>set('description',e.target.value)}
                        placeholder="Décrire les défauts constatés…"
                      />
                      {errors.description && <p style={{ fontSize:'12px', color:'#dc2626', margin:'4px 0 0', fontFamily: FONT }}>{errors.description}</p>}
                    </td>
                    <td style={cell}>
                      <textarea
                        className="form-textarea"
                        style={{ border:'none', boxShadow:'none', padding:0, minHeight:'100px', resize:'vertical' }}
                        value={form.observations}
                        onChange={e=>set('observations',e.target.value)}
                        placeholder="Observations complémentaires…"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Catégorie + Priorité */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                <F label="Catégorie">
                  <select className="form-select" value={form.category} onChange={e=>set('category',e.target.value)}>
                    {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </F>
                <F label="Niveau de priorité">
                  <select className="form-select" value={form.priority} onChange={e=>set('priority',e.target.value)}>
                    {PRIORITIES.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </F>
              </div>

              {/* Réservé services techniques */}
              <div style={{ border:'1px solid #e5e7eb', borderRadius:'8px', overflow:'hidden' }}>
                <div style={{ background:'#f9fafb', padding:'10px 14px', borderBottom:'1px solid #e5e7eb', fontSize:'11px', fontWeight:'600', color:'#6b7280', textTransform:'uppercase', letterSpacing:'.06em', fontFamily: FONT }}>
                  Réservé aux services techniques
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', fontSize:'12px', color:'#9ca3af', fontFamily: FONT }}>
                  <div style={{ padding:'12px 14px', borderRight:'1px solid #e5e7eb' }}>
                    <strong style={{ color:'#6b7280', display:'block', marginBottom:'4px' }}>Travaux à effectuer</strong>
                    <em>À compléter par le technicien via la page du ticket</em>
                  </div>
                  <div style={{ padding:'12px 14px' }}>
                    <strong style={{ color:'#6b7280', display:'block', marginBottom:'4px' }}>Matériels à fournir</strong>
                    <em>À compléter par le technicien via la page du ticket</em>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Erreur globale */}
          {globalErr && (
            <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:'10px', padding:'12px 16px', fontSize:'13px', color:'#991b1b', fontFamily: FONT }}>
              {globalErr}
            </div>
          )}

          {/* Boutons */}
          <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px' }}>
            <button className="btn-secondary" onClick={() => navigate('/tickets')}>Annuler</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Soumettre la demande'}
            </button>
          </div>

        </div>
      </div>
    </AppLayout>
  )
}
