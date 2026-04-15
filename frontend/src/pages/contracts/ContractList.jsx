import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'

const STATUS_MAP = {
  active:    { bg: '#EAF3DE', color: '#27500A', label: 'Actif' },
  expired:   { bg: '#FCEBEB', color: '#791F1F', label: 'Expiré' },
  pending:   { bg: '#FAEEDA', color: '#633806', label: 'En attente' },
  cancelled: { bg: '#F1EFE8', color: '#5F5E5A', label: 'Résilié' },
}

const TYPE_MAP = {
  warranty:    { label: 'Garantie' },
  maintenance: { label: 'Maintenance' },
  support:     { label: 'Support' },
  lease:       { label: 'Leasing' },
  other:       { label: 'Autre' },
}

function Badge({ value, map }) {
  const s = map[value] ?? { bg: '#F1EFE8', color: '#444441', label: value }
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: '11px', padding: '2px 7px',
      borderRadius: '4px', fontWeight: '500',
    }}>
      {s.label ?? value}
    </span>
  )
}

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const TYPE_FILTERS = [
  { label: 'Tous', value: '' },
  { label: 'Garantie', value: 'warranty' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Support', value: 'support' },
  { label: 'Leasing', value: 'lease' },
]

export default function ContractList() {
  const navigate = useNavigate()
  const [contracts, setContracts] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [showExpiring, setShowExpiring] = useState(false)
  const [page, setPage] = useState(1)

  const PAGE_SIZE = 20

  const fetchContracts = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (typeFilter) params.append('type', typeFilter)
    if (showExpiring) params.append('expiring_soon', 'true')
    params.append('page', page)

    api.get(`/contracts/?${params.toString()}`)
      .then(res => {
        setContracts(res.data.results ?? res.data)
        setCount(res.data.count ?? 0)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchContracts()
  }, [typeFilter, showExpiring, page])

  const totalPages = Math.ceil(count / PAGE_SIZE)

  return (
    <AppLayout topbar={
      <TopBar
        title="Contrats & Garanties"
        actions={
          <button
            onClick={() => navigate('/contracts/new')}
            style={{
              background: '#C2185B', color: '#fff', border: 'none',
              borderRadius: '6px', padding: '7px 14px',
              fontSize: '12px', cursor: 'pointer',
            }}
          >
            + Nouveau contrat
          </button>
        }
      />
    }>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setTypeFilter(f.value); setPage(1) }}
              style={{
                padding: '5px 12px', borderRadius: '20px', fontSize: '12px',
                border: '0.5px solid',
                borderColor: typeFilter === f.value ? '#1B5E20' : '#e0e0e0',
                background: typeFilter === f.value ? '#1B5E20' : '#fff',
                color: typeFilter === f.value ? '#fff' : '#666',
                cursor: 'pointer', transition: 'all .15s',
              }}
            >
              {f.label}
            </button>
          ))}

          <div style={{ width: '1px', height: '20px', background: '#e0e0e0' }} />

          {/* Toggle expirant bientôt */}
          <button
            onClick={() => { setShowExpiring(e => !e); setPage(1) }}
            style={{
              padding: '5px 12px', borderRadius: '20px', fontSize: '12px',
              border: '0.5px solid',
              borderColor: showExpiring ? '#C2185B' : '#e0e0e0',
              background: showExpiring ? '#C2185B' : '#fff',
              color: showExpiring ? '#fff' : '#666',
              cursor: 'pointer', transition: 'all .15s',
            }}
          >
            ⚠ Expirant bientôt
          </button>
        </div>

        {/* Tableau */}
        <div style={{
          background: '#fff', border: '0.5px solid #e0e0e0',
          borderRadius: '8px', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {['Nom', 'Type', 'Équipement', 'Fournisseur', 'Début', 'Fin', 'Expire dans', 'Statut'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '10px 12px',
                    color: '#888', fontWeight: '400',
                    borderBottom: '0.5px solid #eee', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>
                  Chargement...
                </td></tr>
              ) : contracts.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>
                  Aucun contrat trouvé
                </td></tr>
              ) : (
                contracts.map(c => {
                  const days = daysUntil(c.end_date)
                  const isUrgent = days <= 30 && days >= 0
                  const isExpired = days < 0

                  return (
                    <tr key={c.id}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', fontWeight: '500' }}>
                        {c.name}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', color: '#666' }}>
                        {TYPE_MAP[c.type]?.label ?? c.type}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', color: '#666' }}>
                        {c.equipment_name || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', color: '#666' }}>
                        {c.supplier_name || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', color: '#888', whiteSpace: 'nowrap' }}>
                        {new Date(c.start_date).toLocaleDateString('fr-FR')}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', color: '#888', whiteSpace: 'nowrap' }}>
                        {new Date(c.end_date).toLocaleDateString('fr-FR')}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', whiteSpace: 'nowrap' }}>
                        {isExpired ? (
                          <span style={{ color: '#791F1F', fontSize: '11px' }}>
                            Expiré depuis {Math.abs(days)}j
                          </span>
                        ) : isUrgent ? (
                          <span style={{ color: '#BA7517', fontSize: '11px', fontWeight: '500' }}>
                            ⚠ {days}j
                          </span>
                        ) : (
                          <span style={{ color: '#888', fontSize: '11px' }}>
                            {days}j
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5' }}>
                        <Badge value={c.status} map={STATUS_MAP} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '5px 10px', border: '0.5px solid #e0e0e0',
                borderRadius: '4px 0 0 4px', background: '#fff',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                color: page === 1 ? '#ccc' : '#666', fontSize: '12px',
              }}
            >←</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .map((n, idx, arr) => (
                <>
                  {idx > 0 && arr[idx - 1] !== n - 1 && (
                    <span key={`dots-${n}`} style={{ padding: '5px 8px', fontSize: '12px', color: '#aaa' }}>…</span>
                  )}
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    style={{
                      padding: '5px 10px', border: '0.5px solid #e0e0e0',
                      background: page === n ? '#1B5E20' : '#fff',
                      color: page === n ? '#fff' : '#666',
                      cursor: 'pointer', fontSize: '12px',
                    }}
                  >{n}</button>
                </>
              ))
            }
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: '5px 10px', border: '0.5px solid #e0e0e0',
                borderRadius: '0 4px 4px 0', background: '#fff',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                color: page === totalPages ? '#ccc' : '#666', fontSize: '12px',
              }}
            >→</button>
          </div>
        )}

        <div style={{ fontSize: '11px', color: '#aaa', textAlign: 'right' }}>
          {count} contrat{count > 1 ? 's' : ''} au total
        </div>

      </div>
    </AppLayout>
  )
}