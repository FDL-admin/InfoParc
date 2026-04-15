import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

const STATUS_MAP = {
  open:        { bg: '#E6F1FB', color: '#185FA5', label: 'Ouvert' },
  assigned:    { bg: '#EEEDFE', color: '#3C3489', label: 'Assigné' },
  in_progress: { bg: '#FAEEDA', color: '#633806', label: 'En cours' },
  waiting:     { bg: '#F1EFE8', color: '#5F5E5A', label: 'En attente' },
  resolved:    { bg: '#EAF3DE', color: '#27500A', label: 'Résolu' },
  closed:      { bg: '#F1EFE8', color: '#444441', label: 'Clôturé' },
}

const PRIORITY_MAP = {
  critical: { bg: '#FCEBEB', color: '#791F1F', label: 'Critique' },
  high:     { bg: '#FAEEDA', color: '#633806', label: 'Haute' },
  normal:   { bg: '#F1EFE8', color: '#5F5E5A', label: 'Normale' },
  low:      { bg: '#E6F1FB', color: '#185FA5', label: 'Basse' },
}

// Transitions autorisées par statut
const TRANSITIONS = {
  open:        ['assigned'],
  assigned:    ['in_progress', 'open'],
  in_progress: ['waiting', 'resolved'],
  waiting:     ['in_progress'],
  resolved:    ['closed'],
  closed:      [],
}

const TRANSITION_LABELS = {
  assigned:    'Assigner',
  in_progress: 'Démarrer',
  waiting:     'Mettre en attente',
  resolved:    'Marquer résolu',
  closed:      'Clôturer',
  open:        'Réouvrir',
}

function Badge({ value, map }) {
  const s = map[value] ?? { bg: '#F1EFE8', color: '#444441', label: value }
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: '12px', padding: '3px 9px',
      borderRadius: '4px', fontWeight: '500',
    }}>
      {s.label}
    </span>
  )
}

function Section({ title, children }) {
  return (
    <div style={{
      background: '#fff', border: '0.5px solid #e0e0e0',
      borderRadius: '8px', padding: '16px',
    }}>
      <div style={{
        fontSize: '13px', fontWeight: '500', color: '#1B5E20',
        marginBottom: '12px', paddingBottom: '8px',
        borderBottom: '0.5px solid #f0f0f0',
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ fontSize: '11px', color: '#888', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#333' }}>{value || '—'}</div>
    </div>
  )
}

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)

  // Formulaire intervention
  const [showInterventionForm, setShowInterventionForm] = useState(false)
  const [intervention, setIntervention] = useState({
    description: '',
    duration_minutes: '',
    materials_provided: '',
    purchase_order_number: '',
  })
  const [savingIntervention, setSavingIntervention] = useState(false)

  const [techniciens, setTechniciens] = useState([])
  const [selectedTech, setSelectedTech] = useState('')
  const [assigning, setAssigning] = useState(false)

  const [evalRating, setEvalRating] = useState(0)
  const [evalComment, setEvalComment] = useState('')
  const [evalSaving, setEvalSaving] = useState(false)
  const [evalError, setEvalError] = useState('')

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const fetchTicket = () => {
    api.get(`/tickets/${id}/`)
      .then(res => setTicket(res.data))
      .catch(() => navigate('/tickets'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTicket() }, [id])

  useEffect(() => {
    api.get('/users/')
      .then(res => {
        const all = res.data.results ?? res.data
        setTechniciens(all.filter(u => u.role === 'admin' || u.role === 'superadmin'))
      })
      .catch(() => {})
  }, [])

  const handleAssign = async () => {
    if (!selectedTech) return
    setAssigning(true)
    try {
      await api.patch(`/tickets/${id}/update_status/`, {
        status: 'assigned',
        assigned_to: parseInt(selectedTech),
      })
      fetchTicket()
    } catch (e) {
      alert(e.response?.data?.detail ?? 'Erreur lors de l\'assignation.')
    } finally {
      setAssigning(false)
    }
  }

  const handleTransition = async (newStatus) => {
    if (!confirm(`Passer le ticket à "${STATUS_MAP[newStatus]?.label}" ?`)) return
    setTransitioning(true)
    try {
      await api.patch(`/tickets/${id}/update_status/`, { status: newStatus })
      fetchTicket()
    } catch (e) {
      alert(e.response?.data?.status?.[0] ?? 'Erreur lors de la transition.')
    } finally {
      setTransitioning(false)
    }
  }

  const handleClose = async () => {
    if (!confirm('Clôturer définitivement ce ticket ?')) return
    try {
      await api.post(`/tickets/${id}/close/`)
      fetchTicket()
    } catch (e) {
      alert(e.response?.data?.detail ?? 'Erreur lors de la clôture.')
    }
  }

  const handleArchive = async () => {
    if (!confirm('Archiver ce ticket ?')) return
    try {
      await api.post(`/tickets/${id}/archive/`)
      fetchTicket()
    } catch (e) {
      alert(e.response?.data?.detail ?? 'Erreur lors de l\'archivage.')
    }
  }

  const handleEvaluate = async () => {
    if (!evalRating) {
      setEvalError('Veuillez sélectionner une note.')
      return
    }
    setEvalSaving(true)
    setEvalError('')
    try {
      await api.post(`/tickets/${id}/add_evaluation/`, {
        rating: evalRating,
        comment: evalComment,
      })
      fetchTicket()
    } catch (e) {
      const data = e.response?.data
      if (data && typeof data === 'object') {
        setEvalError(Object.values(data).flat().join(' — '))
      } else {
        setEvalError("Erreur lors de l'envoi de l'évaluation.")
      }
      setEvalSaving(false)
    }
  }

  const handleAddIntervention = async () => {
    if (!intervention.description.trim()) {
      alert('La description est obligatoire.')
      return
    }
    setSavingIntervention(true)
    try {
      await api.post(`/tickets/${id}/add_intervention/`, {
        ...intervention,
        duration_minutes: intervention.duration_minutes
          ? parseInt(intervention.duration_minutes)
          : null,
      })
      setIntervention({
        description: '',
        duration_minutes: '',
        materials_provided: '',
        purchase_order_number: '',
      })
      setShowInterventionForm(false)
      fetchTicket()
    } catch (e) {
      alert(e.response?.data?.detail ?? 'Erreur lors de l\'ajout.')
    } finally {
      setSavingIntervention(false)
    }
  }

  if (loading) return (
    <AppLayout>
      <div style={{ padding: '2rem', color: '#1B5E20' }}>Chargement...</div>
    </AppLayout>
  )

  const transitions = TRANSITIONS[ticket.status] ?? []

  return (
    <AppLayout topbar={
      <TopBar
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => navigate('/tickets')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#888', fontSize: '13px', padding: '0',
              }}
            >← Retour</button>
            <span style={{ color: '#ccc' }}>|</span>
            {ticket.ticket_number}
          </span>
        }
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Transitions de statut */}
            {isAdmin && transitions.map(s => (
              <button
                key={s}
                onClick={() => handleTransition(s)}
                disabled={transitioning}
                style={{
                  padding: '6px 12px', borderRadius: '6px', fontSize: '12px',
                  border: '0.5px solid #1B5E20', background: '#fff',
                  color: '#1B5E20', cursor: 'pointer',
                }}
              >
                {TRANSITION_LABELS[s]}
              </button>
            ))}
            {/* Clôture */}
            {isAdmin && ticket.status === 'resolved' && (
              <button
                onClick={handleClose}
                style={{
                  padding: '6px 12px', borderRadius: '6px', fontSize: '12px',
                  border: 'none', background: '#1B5E20',
                  color: '#fff', cursor: 'pointer',
                }}
              >
                Clôturer
              </button>
            )}
            {/* Archivage */}
            {isAdmin && ticket.status === 'closed' && !ticket.is_archived && (
              <button
                onClick={handleArchive}
                style={{
                  padding: '6px 12px', borderRadius: '6px', fontSize: '12px',
                  border: '0.5px solid #888', background: '#fff',
                  color: '#666', cursor: 'pointer',
                }}
              >
                Archiver
              </button>
            )}
          </div>
        }
      />
    }>

      <div style={{ padding: '16px', display: 'flex', gap: '12px' }}>

        {/* Colonne gauche — infos principales */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <Section title="Informations générales">
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <Badge value={ticket.status} map={STATUS_MAP} />
              <Badge value={ticket.priority} map={PRIORITY_MAP} />
              {ticket.is_archived && (
                <span style={{
                  background: '#F1EFE8', color: '#5F5E5A',
                  fontSize: '12px', padding: '3px 9px',
                  borderRadius: '4px', fontWeight: '500',
                }}>
                  Archivé
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#222', marginBottom: '12px' }}>
              {ticket.title}
            </h2>
            <div style={{
              fontSize: '13px', color: '#555', lineHeight: '1.6',
              marginBottom: '12px', whiteSpace: 'pre-wrap',
            }}>
              {ticket.description}
            </div>
            {ticket.observations && (
              <div style={{
                background: '#F5F5F5', borderRadius: '6px',
                padding: '10px 12px', fontSize: '13px',
                color: '#666', lineHeight: '1.6',
              }}>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Observations</div>
                {ticket.observations}
              </div>
            )}
          </Section>

          {/* Assignation */}
          {isAdmin && ticket.status === 'open' && (
            <div style={{
              background: '#F1F8E9', border: '0.5px solid #A5D6A7',
              borderRadius: '8px', padding: '14px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#1B5E20', marginBottom: '10px' }}>
                Assignation
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={selectedTech}
                  onChange={e => setSelectedTech(e.target.value)}
                  style={{
                    flex: 1, padding: '7px 8px', fontSize: '12px',
                    border: '0.5px solid #A5D6A7', borderRadius: '6px',
                    outline: 'none', background: '#fff',
                  }}
                >
                  <option value="">— Sélectionner un technicien —</option>
                  {techniciens.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssign}
                  disabled={!selectedTech || assigning}
                  style={{
                    padding: '7px 14px', borderRadius: '6px', fontSize: '12px',
                    border: 'none',
                    background: selectedTech && !assigning ? '#1B5E20' : '#A5D6A7',
                    color: '#fff',
                    cursor: selectedTech && !assigning ? 'pointer' : 'not-allowed',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {assigning ? 'En cours...' : 'Assigner'}
                </button>
              </div>
            </div>
          )}

          {/* Interventions */}
          <Section title={`Interventions (${ticket.interventions?.length ?? 0})`}>
            {ticket.interventions?.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '12px' }}>
                Aucune intervention enregistrée
              </div>
            ) : (
              ticket.interventions.map((intv, idx) => (
                <div key={intv.id} style={{
                  border: '0.5px solid #e0e0e0', borderRadius: '6px',
                  padding: '12px', marginBottom: '8px',
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    marginBottom: '8px', alignItems: 'center',
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#1B5E20' }}>
                      Intervention #{idx + 1} — {intv.technician_detail?.first_name} {intv.technician_detail?.last_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      {new Date(intv.date).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#444', marginBottom: '6px', lineHeight: '1.5' }}>
                    {intv.description}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {intv.duration_minutes && (
                      <div style={{ fontSize: '11px', color: '#888' }}>
                        Durée : {intv.duration_minutes} min
                      </div>
                    )}
                    {intv.purchase_order_number && (
                      <div style={{ fontSize: '11px', color: '#888' }}>
                        N° BC : {intv.purchase_order_number}
                      </div>
                    )}
                    {intv.materials_provided && (
                      <div style={{ fontSize: '11px', color: '#888' }}>
                        Matériels : {intv.materials_provided}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Formulaire ajout intervention */}
            {isAdmin && ['assigned', 'in_progress', 'waiting'].includes(ticket.status) && (
              <>
                {!showInterventionForm ? (
                  <button
                    onClick={() => setShowInterventionForm(true)}
                    style={{
                      padding: '7px 14px', borderRadius: '6px', fontSize: '12px',
                      border: '0.5px solid #C2185B', color: '#C2185B',
                      background: '#fff', cursor: 'pointer',
                    }}
                  >
                    + Ajouter une intervention
                  </button>
                ) : (
                  <div style={{
                    border: '0.5px solid #e0e0e0', borderRadius: '6px',
                    padding: '14px', marginTop: '4px',
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#1B5E20', marginBottom: '10px' }}>
                      Nouvelle intervention
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                        Description *
                      </div>
                      <textarea
                        value={intervention.description}
                        onChange={e => setIntervention(p => ({ ...p, description: e.target.value }))}
                        rows={3}
                        style={{
                          width: '100%', padding: '8px', fontSize: '12px',
                          border: '0.5px solid #ccc', borderRadius: '6px',
                          resize: 'vertical', outline: 'none',
                        }}
                        placeholder="Décrivez l'intervention effectuée..."
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                          Durée (minutes)
                        </div>
                        <input
                          type="number"
                          value={intervention.duration_minutes}
                          onChange={e => setIntervention(p => ({ ...p, duration_minutes: e.target.value }))}
                          style={{
                            width: '100%', padding: '7px 8px', fontSize: '12px',
                            border: '0.5px solid #ccc', borderRadius: '6px', outline: 'none',
                          }}
                          placeholder="ex: 45"
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                          N° bon de commande
                        </div>
                        <input
                          value={intervention.purchase_order_number}
                          onChange={e => setIntervention(p => ({ ...p, purchase_order_number: e.target.value }))}
                          style={{
                            width: '100%', padding: '7px 8px', fontSize: '12px',
                            border: '0.5px solid #ccc', borderRadius: '6px', outline: 'none',
                          }}
                          placeholder="ex: BC-2026-001"
                        />
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                        Matériels fournis
                      </div>
                      <input
                        value={intervention.materials_provided}
                        onChange={e => setIntervention(p => ({ ...p, materials_provided: e.target.value }))}
                        style={{
                          width: '100%', padding: '7px 8px', fontSize: '12px',
                          border: '0.5px solid #ccc', borderRadius: '6px', outline: 'none',
                        }}
                        placeholder="ex: Câble réseau, RAM 8Go..."
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={handleAddIntervention}
                        disabled={savingIntervention}
                        style={{
                          padding: '7px 16px', borderRadius: '6px', fontSize: '12px',
                          border: 'none', background: '#1B5E20',
                          color: '#fff', cursor: 'pointer',
                        }}
                      >
                        {savingIntervention ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                      <button
                        onClick={() => setShowInterventionForm(false)}
                        style={{
                          padding: '7px 14px', borderRadius: '6px', fontSize: '12px',
                          border: '0.5px solid #ccc', background: '#fff',
                          color: '#666', cursor: 'pointer',
                        }}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Section>

          {/* Évaluation */}
          {(ticket.status === 'resolved' || ticket.status === 'closed') && user?.id === ticket.requester && (
            <div style={{
              background: '#FFF8E1', border: '0.5px solid #FFE082',
              borderRadius: '8px', padding: '16px',
            }}>
              <div style={{
                fontSize: '13px', fontWeight: '500', color: '#BA7517',
                marginBottom: '12px', paddingBottom: '8px',
                borderBottom: '0.5px solid #FFE082',
              }}>
                Votre avis
              </div>

              {ticket.evaluation ? (
                <div>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    {[1,2,3,4,5].map(i => (
                      <span key={i} style={{
                        fontSize: '20px',
                        color: i <= ticket.evaluation.rating ? '#BA7517' : '#e0e0e0',
                      }}>★</span>
                    ))}
                  </div>
                  {ticket.evaluation.comment && (
                    <div style={{
                      fontSize: '13px', color: '#555', lineHeight: '1.6',
                      marginBottom: '8px',
                    }}>
                      {ticket.evaluation.comment}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: '#27500A', fontWeight: '500' }}>
                    Évaluation soumise
                  </div>
                </div>
              ) : (
                <div>
                  {/* Étoiles cliquables */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>
                      Note *
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1,2,3,4,5].map(i => (
                        <span
                          key={i}
                          onClick={() => setEvalRating(i)}
                          style={{
                            fontSize: '24px', cursor: 'pointer',
                            color: i <= evalRating ? '#BA7517' : '#e0e0e0',
                            transition: 'color .1s',
                            userSelect: 'none',
                          }}
                        >
                          {i <= evalRating ? '★' : '☆'}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Commentaire */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                      Commentaire (optionnel)
                    </div>
                    <textarea
                      value={evalComment}
                      onChange={e => setEvalComment(e.target.value)}
                      rows={3}
                      placeholder="Laissez un commentaire sur l'intervention..."
                      style={{
                        width: '100%', padding: '8px', fontSize: '12px',
                        border: '0.5px solid #FFD54F', borderRadius: '6px',
                        resize: 'vertical', outline: 'none',
                        background: '#FFFDE7', boxSizing: 'border-box',
                        fontFamily: 'inherit', lineHeight: '1.5',
                      }}
                    />
                  </div>

                  {evalError && (
                    <div style={{
                      fontSize: '12px', color: '#791F1F',
                      background: '#FCEBEB', border: '0.5px solid #F09595',
                      borderRadius: '4px', padding: '8px 12px',
                      marginBottom: '10px',
                    }}>
                      {evalError}
                    </div>
                  )}

                  <button
                    onClick={handleEvaluate}
                    disabled={evalSaving || !evalRating}
                    style={{
                      padding: '8px 18px', borderRadius: '6px', fontSize: '12px',
                      border: 'none',
                      background: evalRating && !evalSaving ? '#BA7517' : '#e0c97a',
                      color: '#fff',
                      cursor: evalRating && !evalSaving ? 'pointer' : 'not-allowed',
                      fontWeight: '500',
                    }}
                  >
                    {evalSaving ? 'Envoi...' : "Soumettre l'évaluation"}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Colonne droite — méta */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <Section title="Détails">
            <Field label="Numéro" value={ticket.ticket_number} />
            <Field label="Catégorie" value={ticket.category} />
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '3px' }}>Statut</div>
              <Badge value={ticket.status} map={STATUS_MAP} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '3px' }}>Priorité</div>
              <Badge value={ticket.priority} map={PRIORITY_MAP} />
            </div>
            <Field
              label="Demandeur"
              value={ticket.requester_detail
                ? `${ticket.requester_detail.first_name} ${ticket.requester_detail.last_name}`
                : null}
            />
            <Field
              label="Département du demandeur"
              value={ticket.requester_detail?.department?.name}
            />
            <Field
              label="Assigné à"
              value={ticket.assigned_to_detail
                ? `${ticket.assigned_to_detail.first_name} ${ticket.assigned_to_detail.last_name}`
                : 'Non assigné'}
            />
            <Field
              label="Équipement concerné"
              value={ticket.equipment_detail?.name}
            />
          </Section>

          <Section title="Dates">
            <Field
              label="Créé le"
              value={new Date(ticket.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            />
            {ticket.resolved_at && (
              <Field
                label="Résolu le"
                value={new Date(ticket.resolved_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              />
            )}
            {ticket.closed_at && (
              <Field
                label="Clôturé le"
                value={new Date(ticket.closed_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              />
            )}
          </Section>

        </div>
      </div>
    </AppLayout>
  )
}