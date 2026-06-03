import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { useDialog } from '../../context/DialogContext'

const FONT = "'Inter', system-ui, sans-serif"

const STATUS_MAP = {
  open:        { bg: '#dbeafe', color: '#1e40af', label: 'Ouvert' },
  assigned:    { bg: '#ede9fe', color: '#5b21b6', label: 'Assigné' },
  in_progress: { bg: '#fef3c7', color: '#92400e', label: 'En cours' },
  waiting:     { bg: '#f3f4f6', color: '#6b7280', label: 'En attente' },
  resolved:    { bg: '#dcfce7', color: '#166534', label: 'Résolu' },
  closed:      { bg: '#f3f4f6', color: '#374151', label: 'Clôturé' },
}

const PRIORITY_MAP = {
  critical: { dot: '#dc2626', color: '#991b1b', label: 'Critique' },
  high:     { dot: '#d97706', color: '#92400e', label: 'Haute' },
  normal:   { dot: '#9ca3af', color: '#6b7280', label: 'Normale' },
  low:      { dot: '#38bdf8', color: '#075985', label: 'Basse' },
}

const CATEGORY_MAP = {
  hardware: 'Panne matérielle', software: 'Logiciel',
  network: 'Réseau', printer: 'Imprimante', other: 'Autre',
}

const TRANSITIONS = {
  open: ['assigned'], assigned: ['in_progress', 'open'],
  in_progress: ['waiting', 'resolved'], waiting: ['in_progress'],
  resolved: ['closed'], closed: [],
}
const TRANSITION_LABELS = {
  assigned: 'Assigner', in_progress: 'Démarrer', waiting: 'Mettre en attente',
  resolved: 'Marquer résolu', closed: 'Clôturer', open: 'Réouvrir',
}

// ── Composants ────────────────────────────────────────────────
function StatusBadge({ value }) {
  const s = STATUS_MAP[value] ?? { bg: '#f3f4f6', color: '#6b7280', label: value }
  return <span style={{ background: s.bg, color: s.color, fontSize: '12px', padding: '3px 10px', borderRadius: '6px', fontWeight: '500', fontFamily: FONT }}>{s.label}</span>
}

function PriorityBadge({ value }) {
  const p = PRIORITY_MAP[value] ?? { dot: '#9ca3af', color: '#6b7280', label: value }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: p.color, fontFamily: FONT }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.dot, display: 'inline-block' }}/>
      {p.label}
    </span>
  )
}

function Card({ title, children, style = {} }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', ...style }}>
      {title && <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontSize: '13px', fontWeight: '600', color: '#111827', fontFamily: FONT }}>{title}</div>}
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  )
}

function MetaRow({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f9fafb', fontFamily: FONT }}>
      <span style={{ fontSize: '12.5px', color: '#9ca3af' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500', textAlign: 'right', maxWidth: '60%' }}>{children || '—'}</span>
    </div>
  )
}

function fmtDate(d, opts = {}) {
  return d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', ...opts }) : '—'
}

// ── Page principale ───────────────────────────────────────────
export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { confirm, toast } = useDialog()

  const [ticket,       setTicket]       = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [transitioning, setTransitioning] = useState(false)

  const [techniciens,  setTechniciens]  = useState([])
  const [selectedTech, setSelectedTech] = useState('')
  const [assigning,    setAssigning]    = useState(false)

  const [showIntvForm, setShowIntvForm] = useState(false)
  const [intv,         setIntv]         = useState({ description: '', duration_minutes: '', materials_provided: '', purchase_order_number: '' })
  const [savingIntv,   setSavingIntv]   = useState(false)
  const [intvError,    setIntvError]    = useState('')

  const [evalRating,  setEvalRating]   = useState(0)
  const [evalComment, setEvalComment]  = useState('')
  const [evalSaving,  setEvalSaving]   = useState(false)
  const [evalError,   setEvalError]    = useState('')

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const fetchTicket = () => {
    api.get(`/tickets/${id}/`)
      .then(r => setTicket(r.data))
      .catch(() => navigate('/tickets'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { fetchTicket() }, [id])
  useEffect(() => {
    api.get('/users/').then(r => {
      const all = r.data.results ?? r.data
      setTechniciens(all.filter(u => u.role === 'admin' || u.role === 'superadmin'))
    }).catch(() => {})
  }, [])

  const handleAssign = async () => {
    if (!selectedTech) return
    setAssigning(true)
    try { await api.patch(`/tickets/${id}/update_status/`, { status: 'assigned', assigned_to: parseInt(selectedTech) }); fetchTicket() }
    catch (e) { toast({ title: 'Erreur', message: e.response?.data?.detail ?? 'Erreur lors de l\'assignation.', variant: 'danger' }) }
    finally { setAssigning(false) }
  }

  const handleTransition = async (newStatus) => {
    const label = STATUS_MAP[newStatus]?.label ?? newStatus
    const ok = await confirm({ title: `Passer à "${label}"`, message: `Confirmer le changement de statut vers "${label}" ?`, confirmLabel: 'Confirmer' })
    if (!ok) return
    setTransitioning(true)
    try { await api.patch(`/tickets/${id}/update_status/`, { status: newStatus }); fetchTicket() }
    catch (e) { toast({ title: 'Erreur', message: e.response?.data?.status?.[0] ?? 'Erreur.', variant: 'danger' }) }
    finally { setTransitioning(false) }
  }

  const handleClose = async () => {
    const ok = await confirm({ title: 'Clôturer le ticket', message: 'Action définitive. Le ticket sera clôturé.', variant: 'warning', confirmLabel: 'Clôturer' })
    if (!ok) return
    try { await api.post(`/tickets/${id}/close/`); fetchTicket() }
    catch (e) { toast({ title: 'Erreur', message: e.response?.data?.detail ?? 'Erreur.', variant: 'danger' }) }
  }

  const handleArchive = async () => {
    const ok = await confirm({ title: 'Archiver le ticket', message: 'Ce ticket n\'apparaîtra plus dans la liste principale.', confirmLabel: 'Archiver' })
    if (!ok) return
    try { await api.post(`/tickets/${id}/archive/`); fetchTicket() }
    catch (e) { toast({ title: 'Erreur', message: e.response?.data?.detail ?? 'Erreur.', variant: 'danger' }) }
  }

  const handleExportPdf = async () => {
    try {
      const r = await api.get(`/tickets/${id}/export_pdf/`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url; a.download = `DI_${ticket.ticket_number}.pdf`
      document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(url)
    } catch { toast({ title: 'Erreur', message: 'Erreur lors de l\'export PDF.', variant: 'danger' }) }
  }

  const handleDeleteIntv = async (intvId) => {
    const ok = await confirm({ title: 'Supprimer l\'intervention', message: 'Cette intervention sera supprimée définitivement.', variant: 'danger', confirmLabel: 'Supprimer' })
    if (!ok) return
    try { await api.delete(`/interventions/${intvId}/`); fetchTicket() }
    catch (e) { setIntvError(e.response?.data?.detail ?? 'Erreur lors de la suppression.') }
  }

  const handleAddIntv = async () => {
    if (!intv.description.trim()) { toast({ title: 'Requis', message: 'La description est obligatoire.', variant: 'warning' }); return }
    setSavingIntv(true)
    try {
      await api.post(`/tickets/${id}/add_intervention/`, { ...intv, duration_minutes: intv.duration_minutes ? parseInt(intv.duration_minutes) : null })
      setIntv({ description: '', duration_minutes: '', materials_provided: '', purchase_order_number: '' })
      setShowIntvForm(false); fetchTicket()
    } catch (e) { toast({ title: 'Erreur', message: e.response?.data?.detail ?? 'Erreur lors de l\'ajout.', variant: 'danger' }) }
    finally { setSavingIntv(false) }
  }

  const handleEvaluate = async () => {
    if (!evalRating) { setEvalError('Veuillez sélectionner une note.'); return }
    setEvalSaving(true); setEvalError('')
    try { await api.post(`/tickets/${id}/add_evaluation/`, { rating: evalRating, comment: evalComment }); fetchTicket() }
    catch (e) {
      const d = e.response?.data
      setEvalError(d && typeof d === 'object' ? Object.values(d).flat().join(' — ') : 'Erreur lors de l\'envoi.')
      setEvalSaving(false)
    }
  }

  if (loading) return <AppLayout><div style={{ padding: '2rem', color: '#1B5E20', fontFamily: FONT }}>Chargement…</div></AppLayout>
  if (!ticket) return null

  const transitions = TRANSITIONS[ticket.status] ?? []

  return (
    <AppLayout topbar={
      <TopBar
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: FONT }}>
            <button onClick={() => navigate('/tickets')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontFamily: FONT }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Tickets
            </button>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span style={{ color: '#6b7280', fontFamily: 'ui-monospace, monospace', fontSize: '12.5px' }}>{ticket.ticket_number}</span>
          </span>
        }
        actions={
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button onClick={handleExportPdf} style={{ background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '7px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              PDF
            </button>
            {isAdmin && transitions.map(s => (
              <button key={s} onClick={() => handleTransition(s)} disabled={transitioning}
                style={{ padding: '6px 12px', borderRadius: '7px', fontSize: '13px', border: '1px solid #1B5E20', background: '#fff', color: '#1B5E20', cursor: 'pointer', fontFamily: FONT, transition: 'all .12s' }}>
                {TRANSITION_LABELS[s]}
              </button>
            ))}
            {isAdmin && ticket.status === 'resolved' && (
              <button onClick={handleClose} className="btn-primary" style={{ padding: '6px 14px' }}>Clôturer</button>
            )}
            {isAdmin && ticket.status === 'closed' && !ticket.is_archived && (
              <button onClick={handleArchive} className="btn-secondary" style={{ padding: '6px 14px' }}>Archiver</button>
            )}
          </div>
        }
      />
    }>

      <div style={{ padding: '20px 24px', background: '#f8f9fa', minHeight: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', alignItems: 'start' }}>

          {/* ── Colonne gauche ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Titre + description */}
            <Card>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                <StatusBadge value={ticket.status} />
                <PriorityBadge value={ticket.priority} />
                {ticket.is_archived && <span style={{ background: '#f3f4f6', color: '#6b7280', fontSize: '11.5px', padding: '3px 9px', borderRadius: '6px', fontFamily: FONT }}>Archivé</span>}
              </div>
              <h2 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: '600', color: '#111827', fontFamily: FONT }}>{ticket.title}</h2>
              <p style={{ margin: '0', fontSize: '13.5px', color: '#374151', lineHeight: '1.65', whiteSpace: 'pre-wrap', fontFamily: FONT }}>{ticket.description}</p>
              {ticket.observations && (
                <div style={{ marginTop: '14px', background: '#f9fafb', borderRadius: '8px', padding: '12px 14px', border: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px', fontFamily: FONT }}>Observations</div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: '1.6', fontFamily: FONT }}>{ticket.observations}</p>
                </div>
              )}
            </Card>

            {/* Assignation — ticket ouvert */}
            {isAdmin && ticket.status === 'open' && (
              <Card title="Assigner un technicien">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select className="form-select" value={selectedTech} onChange={e => setSelectedTech(e.target.value)} style={{ flex: 1 }}>
                    <option value="">— Sélectionner un technicien —</option>
                    {techniciens.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                  </select>
                  <button className="btn-primary" onClick={handleAssign} disabled={!selectedTech || assigning} style={{ whiteSpace: 'nowrap' }}>
                    {assigning ? 'En cours…' : 'Assigner'}
                  </button>
                </div>
              </Card>
            )}

            {/* Interventions */}
            <Card title={`Interventions (${ticket.interventions?.length ?? 0})`}>
              {intvError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#991b1b', marginBottom: '12px', fontFamily: FONT }}>{intvError}</div>
              )}

              {(ticket.interventions?.length ?? 0) === 0 ? (
                <p style={{ color: '#d1d5db', fontSize: '13px', fontStyle: 'italic', margin: '0 0 12px', fontFamily: FONT }}>Aucune intervention enregistrée</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                  {ticket.interventions.map((intv, idx) => (
                    <div key={intv.id} style={{ border: '1px solid #f3f4f6', borderRadius: '10px', padding: '14px', background: '#fafafa' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#1B5E20', fontFamily: FONT }}>
                          #{idx + 1} — {intv.technician_detail?.first_name} {intv.technician_detail?.last_name}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {isAdmin && !['resolved','closed'].includes(ticket.status) && (
                            <button className="btn-danger" style={{ padding: '3px 10px', fontSize: '12px' }} onClick={() => handleDeleteIntv(intv.id)}>Supprimer</button>
                          )}
                          <span style={{ fontSize: '12px', color: '#9ca3af', fontFamily: FONT }}>
                            {fmtDate(intv.date, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <p style={{ margin: '0 0 8px', fontSize: '13.5px', color: '#374151', lineHeight: '1.5', fontFamily: FONT }}>{intv.description}</p>
                      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        {intv.duration_minutes && <span style={{ fontSize: '12px', color: '#9ca3af', fontFamily: FONT }}>⏱ {intv.duration_minutes} min</span>}
                        {intv.purchase_order_number && <span style={{ fontSize: '12px', color: '#9ca3af', fontFamily: FONT }}>BC : {intv.purchase_order_number}</span>}
                        {intv.materials_provided && <span style={{ fontSize: '12px', color: '#9ca3af', fontFamily: FONT }}>Mat. : {intv.materials_provided}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulaire ajout */}
              {isAdmin && ['assigned','in_progress','waiting'].includes(ticket.status) && (
                showIntvForm ? (
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', background: '#fafafa' }}>
                    <h4 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: '600', color: '#374151', fontFamily: FONT }}>Nouvelle intervention</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label className="form-label">Description<span className="required">*</span></label>
                        <textarea className="form-textarea" style={{ minHeight: '80px' }} value={intv.description} onChange={e => setIntv(p => ({ ...p, description: e.target.value }))} placeholder="Décrivez l'intervention effectuée…"/>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label className="form-label">Durée (min)</label>
                          <input type="number" className="form-input" value={intv.duration_minutes} onChange={e => setIntv(p => ({ ...p, duration_minutes: e.target.value }))} placeholder="ex : 45"/>
                        </div>
                        <div>
                          <label className="form-label">N° bon de commande</label>
                          <input className="form-input" value={intv.purchase_order_number} onChange={e => setIntv(p => ({ ...p, purchase_order_number: e.target.value }))} placeholder="BC-2026-001"/>
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Matériels fournis</label>
                        <input className="form-input" value={intv.materials_provided} onChange={e => setIntv(p => ({ ...p, materials_provided: e.target.value }))} placeholder="Câble, RAM, etc."/>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                      <button className="btn-primary" onClick={handleAddIntv} disabled={savingIntv}>{savingIntv ? 'Enregistrement…' : 'Enregistrer'}</button>
                      <button className="btn-secondary" onClick={() => setShowIntvForm(false)}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn-secondary" onClick={() => setShowIntvForm(true)}>+ Ajouter une intervention</button>
                )
              )}
            </Card>

            {/* Évaluation */}
            {(ticket.status === 'resolved' || ticket.status === 'closed') && user?.id === ticket.requester && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '600', color: '#92400e', fontFamily: FONT }}>Votre avis sur l'intervention</h3>

                {ticket.evaluation ? (
                  <div>
                    <div style={{ display: 'flex', gap: '3px', marginBottom: '8px' }}>
                      {[1,2,3,4,5].map(i => (
                        <span key={i} style={{ fontSize: '22px', color: i <= ticket.evaluation.rating ? '#d97706' : '#e5e7eb' }}>★</span>
                      ))}
                    </div>
                    {ticket.evaluation.comment && <p style={{ margin: '0', fontSize: '13.5px', color: '#78350f', lineHeight: '1.6', fontFamily: FONT }}>{ticket.evaluation.comment}</p>}
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#92400e', fontWeight: '600', fontFamily: FONT }}>✓ Évaluation soumise</div>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '14px' }}>
                      <label className="form-label" style={{ color: '#92400e' }}>Note<span className="required">*</span></label>
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                        {[1,2,3,4,5].map(i => (
                          <span key={i} onClick={() => setEvalRating(i)}
                            style={{ fontSize: '28px', cursor: 'pointer', color: i <= evalRating ? '#d97706' : '#e5e7eb', transition: 'color .1s', userSelect: 'none' }}>
                            {i <= evalRating ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label className="form-label" style={{ color: '#92400e' }}>Commentaire (optionnel)</label>
                      <textarea className="form-textarea" style={{ background: '#fff', borderColor: '#fde68a', minHeight: '72px' }}
                        value={evalComment} onChange={e => setEvalComment(e.target.value)}
                        placeholder="Votre retour sur l'intervention…"/>
                    </div>
                    {evalError && <p style={{ fontSize: '12px', color: '#dc2626', margin: '0 0 10px', fontFamily: FONT }}>{evalError}</p>}
                    <button onClick={handleEvaluate} disabled={evalSaving || !evalRating}
                      style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px', border: 'none', background: evalRating ? '#d97706' : '#fde68a', color: evalRating ? '#fff' : '#9ca3af', cursor: evalRating ? 'pointer' : 'not-allowed', fontFamily: FONT, fontWeight: '500' }}>
                      {evalSaving ? 'Envoi…' : 'Soumettre l\'évaluation'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Colonne droite ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            <Card title="Détails">
              <MetaRow label="Numéro"><span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '12px' }}>{ticket.ticket_number}</span></MetaRow>
              <MetaRow label="Statut"><StatusBadge value={ticket.status} /></MetaRow>
              <MetaRow label="Priorité"><PriorityBadge value={ticket.priority} /></MetaRow>
              <MetaRow label="Catégorie">{CATEGORY_MAP[ticket.category] ?? ticket.category}</MetaRow>
              <MetaRow label="Demandeur">
                {ticket.requester_detail ? `${ticket.requester_detail.first_name} ${ticket.requester_detail.last_name}` : '—'}
              </MetaRow>
              <MetaRow label="Département">{ticket.requester_detail?.department?.name}</MetaRow>
              <MetaRow label="Assigné à">
                {ticket.assigned_to_detail ? `${ticket.assigned_to_detail.first_name} ${ticket.assigned_to_detail.last_name}` : 'Non assigné'}
              </MetaRow>
              {ticket.equipment_detail && <MetaRow label="Équipement">{ticket.equipment_detail.name}</MetaRow>}
            </Card>

            <Card title="Chronologie">
              <MetaRow label="Créé le">{fmtDate(ticket.created_at)}</MetaRow>
              {ticket.resolved_at && <MetaRow label="Résolu le">{fmtDate(ticket.resolved_at)}</MetaRow>}
              {ticket.closed_at   && <MetaRow label="Clôturé le">{fmtDate(ticket.closed_at)}</MetaRow>}
            </Card>

          </div>
        </div>
      </div>
    </AppLayout>
  )
}
