import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'



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

function Badge({ value, map }) {
  const s = map[value] ?? { bg: '#F1EFE8', color: '#444441', label: value }
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: '11px', padding: '2px 7px',
      borderRadius: '4px', fontWeight: '500',
    }}>
      {s.label}
    </span>
  )
}

const FILTERS = [
  { label: 'Tous', value: '' },
  { label: 'Ouvert', value: 'open' },
  { label: 'En cours', value: 'in_progress' },
  { label: 'En attente', value: 'waiting' },
  { label: 'Résolu', value: 'resolved' },
  { label: 'Clôturé', value: 'closed' },
]

export default function TicketList() {
  const [tickets, setTickets] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  const PAGE_SIZE = 20

  const fetchTickets = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (statusFilter) params.append('status', statusFilter)
    params.append('page', page)

    api.get(`/tickets/?${params.toString()}`)
      .then(res => {
        setTickets(res.data.results ?? res.data)
        setCount(res.data.count ?? 0)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchTickets()
  }, [statusFilter, page])

  // Recherche avec délai pour ne pas spammer l'API
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      fetchTickets()
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  const totalPages = Math.ceil(count / PAGE_SIZE)

  return (
    <AppLayout topbar={
      <TopBar
        title="Tickets"
        actions={
          <button
            onClick={() => navigate('/tickets/new')}
            style={{
              background: '#C2185B', color: '#fff', border: 'none',
              borderRadius: '6px', padding: '7px 14px',
              fontSize: '12px', cursor: 'pointer',
            }}
          >
            + Nouvelle DI
          </button>
        }
      />
    }>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Barre de recherche */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: '#fff', border: '0.5px solid #e0e0e0',
          borderRadius: '6px', padding: '7px 12px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#aaa" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher par titre, numéro..."
            style={{
              border: 'none', outline: 'none', fontSize: '13px',
              color: '#333', flex: 1, background: 'transparent',
            }}
          />
        </div>

        {/* Filtres statut */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1) }}
              style={{
                padding: '5px 12px', borderRadius: '20px', fontSize: '12px',
                border: '0.5px solid',
                borderColor: statusFilter === f.value ? '#1B5E20' : '#e0e0e0',
                background: statusFilter === f.value ? '#1B5E20' : '#fff',
                color: statusFilter === f.value ? '#fff' : '#666',
                cursor: 'pointer', transition: 'all .15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tableau */}
        <div style={{
          background: '#fff', border: '0.5px solid #e0e0e0',
          borderRadius: '8px', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {['Numéro', 'Titre', 'Catégorie', 'Priorité', 'Statut', 'Demandeur', 'Créé le'].map(h => (
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
                <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>
                  Chargement...
                </td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>
                  Aucun ticket trouvé
                </td></tr>
              ) : (
                tickets.map(t => (
                  <tr key={t.id} style={{ cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                    onClick={() => navigate(`/tickets/${t.id}`)}

                  >
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', color: '#666' }}>
                      {t.ticket_number}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', maxWidth: '200px' }}>
                      {t.title.length > 35 ? t.title.slice(0, 35) + '…' : t.title}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', color: '#666' }}>
                      {t.category}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5' }}>
                      <Badge value={t.priority} map={PRIORITY_MAP} />
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5' }}>
                      <Badge value={t.status} map={STATUS_MAP} />
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', color: '#666' }}>
                      {t.requester_name}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', color: '#888', whiteSpace: 'nowrap' }}>
                      {new Date(t.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))
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
          {count} ticket{count > 1 ? 's' : ''} au total
        </div>

      </div>
    </AppLayout>
  )
}