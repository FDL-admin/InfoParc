import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

const STATUS_MAP = {
  active:  { bg: '#EAF3DE', color: '#27500A', label: 'Actif' },
  broken:  { bg: '#FCEBEB', color: '#791F1F', label: 'En panne' },
  repair:  { bg: '#FAEEDA', color: '#633806', label: 'En réparation' },
  retired: { bg: '#F1EFE8', color: '#5F5E5A', label: 'Mis au rebut' },
  stock:   { bg: '#E6F1FB', color: '#185FA5', label: 'En stock' },
}

const TYPE_MAP = {
  desktop: 'Desktop', laptop: 'Laptop', printer: 'Imprimante',
  scanner: 'Scanner', server: 'Serveur', network: 'Réseau',
  phone: 'Téléphone', other: 'Autre',
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

export default function EquipmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [equipment, setEquipment] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const fetchEquipment = () => {
    Promise.all([
      api.get(`/equipment/${id}/`),
      api.get(`/equipment/${id}/history/`),
    ])
      .then(([eqRes, histRes]) => {
        setEquipment(eqRes.data)
        setHistory(histRes.data)
      })
      .catch(() => navigate('/equipment'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchEquipment() }, [id])

  const handleUnassign = async () => {
    if (!confirm('Retirer l\'affectation de cet équipement ?')) return
    try {
      await api.post(`/equipment/${id}/unassign/`)
      fetchEquipment()
    } catch {
      alert('Erreur lors de la désaffectation.')
    }
  }

  if (loading) return (
    <AppLayout>
      <div style={{ padding: '2rem', color: '#1B5E20' }}>Chargement...</div>
    </AppLayout>
  )

  const warrantyExpired = equipment.warranty_end_date
    && new Date(equipment.warranty_end_date) < new Date()

  const warrantyDays = equipment.warranty_end_date
    ? Math.ceil((new Date(equipment.warranty_end_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <AppLayout topbar={
      <TopBar
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => navigate('/equipment')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#888', fontSize: '13px', padding: '0',
              }}
            >← Retour</button>
            <span style={{ color: '#ccc' }}>|</span>
            {equipment.name}
          </span>
        }
        actions={
          isAdmin && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => navigate(`/equipment/${id}/edit`)}
                style={{
                  padding: '6px 12px', borderRadius: '6px', fontSize: '12px',
                  border: '0.5px solid #1B5E20', color: '#1B5E20',
                  background: '#fff', cursor: 'pointer',
                }}
              >
                Modifier
              </button>
              {equipment.assigned_to && (
                <button
                  onClick={handleUnassign}
                  style={{
                    padding: '6px 12px', borderRadius: '6px', fontSize: '12px',
                    border: '0.5px solid #E24B4A', color: '#791F1F',
                    background: '#fff', cursor: 'pointer',
                  }}
                >
                  Désaffecter
                </button>
              )}
            </div>
          )
        }
      />
    }>

      <div style={{ padding: '16px', display: 'flex', gap: '12px' }}>

        {/* Colonne gauche */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <Section title="Informations générales">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <Badge value={equipment.status} map={STATUS_MAP} />
              {equipment.is_laptop && (
                <span style={{
                  background: '#EEEDFE', color: '#3C3489',
                  fontSize: '12px', padding: '3px 9px',
                  borderRadius: '4px', fontWeight: '500',
                }}>
                  Laptop
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              <Field label="Nom" value={equipment.name} />
              <Field label="Type" value={TYPE_MAP[equipment.type] ?? equipment.type} />
              <Field label="Marque" value={equipment.brand} />
              <Field label="Modèle" value={equipment.model} />
              <Field label="Numéro de série" value={equipment.serial_number} />
              <Field label="Site" value={equipment.site === 'bobo' ? 'Bobo-Dioulasso' : 'Ouagadougou'} />
              <Field label="Localisation" value={equipment.location} />
              <Field label="Département" value={equipment.department_detail?.name} />
            </div>
          </Section>

          {/* Historique affectations */}
          <Section title={`Historique des affectations (${history.length})`}>
            {history.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#aaa' }}>
                Aucune affectation enregistrée
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr>
                    {['Utilisateur', 'Début', 'Fin', 'Statut'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '6px 8px',
                        color: '#888', fontWeight: '400',
                        borderBottom: '0.5px solid #eee',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id}>
                      <td style={{ padding: '8px', borderBottom: '0.5px solid #f5f5f5' }}>
                        {h.user?.first_name} {h.user?.last_name}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '0.5px solid #f5f5f5', color: '#666' }}>
                        {new Date(h.date_start).toLocaleDateString('fr-FR')}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '0.5px solid #f5f5f5', color: '#666' }}>
                        {h.date_end
                          ? new Date(h.date_end).toLocaleDateString('fr-FR')
                          : <span style={{ color: '#27500A', fontWeight: '500' }}>En cours</span>
                        }
                      </td>
                      <td style={{ padding: '8px', borderBottom: '0.5px solid #f5f5f5' }}>
                        {!h.date_end ? (
                          <span style={{
                            background: '#EAF3DE', color: '#27500A',
                            fontSize: '11px', padding: '2px 7px',
                            borderRadius: '4px', fontWeight: '500',
                          }}>Active</span>
                        ) : (
                          <span style={{
                            background: '#F1EFE8', color: '#5F5E5A',
                            fontSize: '11px', padding: '2px 7px',
                            borderRadius: '4px', fontWeight: '500',
                          }}>Terminée</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </div>

        {/* Colonne droite */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <Section title="Affectation actuelle">
            {equipment.assigned_to_detail ? (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  marginBottom: '10px',
                }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: '#C2185B', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '13px',
                    fontWeight: '500', color: '#fff', flexShrink: 0,
                  }}>
                    {equipment.assigned_to_detail.first_name?.[0]}
                    {equipment.assigned_to_detail.last_name?.[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#222' }}>
                      {equipment.assigned_to_detail.first_name} {equipment.assigned_to_detail.last_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      {equipment.assigned_to_detail.email}
                    </div>
                  </div>
                </div>
                <Field
                  label="Département"
                  value={equipment.department_detail?.name}
                />
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#aaa' }}>
                Non affecté — en stock
              </div>
            )}
          </Section>

          <Section title="Achat & Garantie">
            <Field
              label="Date d'achat"
              value={equipment.purchase_date
                ? new Date(equipment.purchase_date).toLocaleDateString('fr-FR')
                : null}
            />
            <Field
              label="Prix d'achat"
              value={equipment.purchase_price
                ? `${Number(equipment.purchase_price).toLocaleString('fr-FR')} FCFA`
                : null}
            />
            <Field label="Fournisseur" value={equipment.supplier_detail?.name} />
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '3px' }}>
                Fin de garantie
              </div>
              {equipment.warranty_end_date ? (
                <div style={{
                  fontSize: '13px',
                  color: warrantyExpired ? '#791F1F' : warrantyDays <= 30 ? '#BA7517' : '#27500A',
                  fontWeight: '500',
                }}>
                  {new Date(equipment.warranty_end_date).toLocaleDateString('fr-FR')}
                  <span style={{ fontSize: '11px', fontWeight: '400', marginLeft: '6px', color: '#888' }}>
                    {warrantyExpired
                      ? `(expirée depuis ${Math.abs(warrantyDays)}j)`
                      : `(dans ${warrantyDays}j)`}
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#aaa' }}>—</div>
              )}
            </div>
            {equipment.lifespan_years && (
              <Field
                label="Durée de vie estimée"
                value={`${equipment.lifespan_years} an${equipment.lifespan_years > 1 ? 's' : ''}`}
              />
            )}
          </Section>

        </div>
      </div>
    </AppLayout>
  )
}