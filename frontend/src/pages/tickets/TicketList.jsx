import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'

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
  critical: { bg: '#fee2e2', color: '#991b1b', label: 'Critique', dot: '#dc2626' },
  high:     { bg: '#fef3c7', color: '#92400e', label: 'Haute',    dot: '#d97706' },
  normal:   { bg: '#f3f4f6', color: '#6b7280', label: 'Normale',  dot: '#9ca3af' },
  low:      { bg: '#e0f2fe', color: '#075985', label: 'Basse',    dot: '#38bdf8' },
}

const CATEGORY_MAP = {
  hardware: 'Panne matérielle',
  software: 'Logiciel',
  network:  'Réseau',
  printer:  'Imprimante',
  other:    'Autre',
}

const STATUS_FILTERS = [
  { label: 'Tous',        value: '' },
  { label: 'Ouvert',      value: 'open' },
  { label: 'En cours',    value: 'in_progress' },
  { label: 'En attente',  value: 'waiting' },
  { label: 'Résolu',      value: 'resolved' },
  { label: 'Clôturé',     value: 'closed' },
]

// ── Composants ────────────────────────────────────────────────
function StatusBadge({ value }) {
  const s = STATUS_MAP[value] ?? { bg: '#f3f4f6', color: '#6b7280', label: value }
  return (
    <span style={{
      background: s.bg, color: s.color, fontSize: '11.5px',
      padding: '3px 9px', borderRadius: '6px', fontWeight: '500',
      fontFamily: FONT, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

function PriorityBadge({ value }) {
  const p = PRIORITY_MAP[value] ?? { dot: '#9ca3af', label: value, color: '#6b7280' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: p.color, fontFamily: FONT }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.dot, flexShrink: 0, display: 'inline-block' }} />
      {p.label}
    </span>
  )
}

function Pill({ label, active, activeColor, activeBg, onClick, children }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '5px 11px', borderRadius: '7px', cursor: 'pointer',
        fontSize: '13px', fontFamily: FONT, whiteSpace: 'nowrap',
        border: active ? `1.5px solid ${activeColor ?? '#1B5E20'}` : '1px solid #e5e7eb',
        background: active ? (activeBg ?? '#1B5E20') : hov ? '#f9fafb' : '#fff',
        color: active ? (activeBg ? activeColor : '#fff') : '#374151',
        fontWeight: active ? '500' : '400',
        transition: 'all .12s',
      }}
    >
      {children ?? label}
    </button>
  )
}

function PageBtn({ label, active, disabled, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        minWidth: '32px', height: '32px', padding: '0 8px',
        border: active ? '1.5px solid #1B5E20' : '1px solid #e5e7eb', borderRadius: '7px',
        background: active ? '#1B5E20' : hov && !disabled ? '#f9fafb' : '#fff',
        color: active ? '#fff' : disabled ? '#d1d5db' : '#374151',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '13px', fontFamily: FONT, transition: 'all .12s',
      }}>{label}</button>
  )
}

function buildPages(cur, total) {
  const p = []
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - cur) <= 1) p.push(i)
    else if (p[p.length - 1] !== '…') p.push('…')
  }
  return p
}

const thStyle = {
  textAlign: 'left', padding: '11px 16px',
  fontSize: '11px', color: '#9ca3af', fontWeight: '600',
  borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap',
  background: '#fafafa', letterSpacing: '0.07em',
  textTransform: 'uppercase', fontFamily: FONT,
}
const tdStyle = {
  padding: '12px 16px', borderBottom: '1px solid #f3f4f6',
  fontFamily: FONT, verticalAlign: 'middle',
}

// ── Page ─────────────────────────────────────────────────────
export default function TicketList() {
  const [tickets,      setTickets]      = useState([])
  const [count,        setCount]        = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [page,         setPage]         = useState(1)
  const navigate = useNavigate()
  const PAGE_SIZE = 20

  const fetch = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search)      p.append('search', search)
    if (!showArchived && statusFilter) p.append('status', statusFilter)
    p.append('archived', showArchived ? 'true' : 'false')
    p.append('page', page)
    api.get(`/tickets/?${p}`)
      .then(r => { setTickets(r.data.results ?? r.data); setCount(r.data.count ?? 0) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [statusFilter, page, showArchived])
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetch() }, 380)
    return () => clearTimeout(t)
  }, [search])

  const totalPages = Math.ceil(count / PAGE_SIZE)

  return (
    <AppLayout topbar={
      <TopBar
        title={showArchived ? 'Archives' : 'Tickets'}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { setShowArchived(a => !a); setPage(1); setStatusFilter('') }}
              style={{
                borderRadius: '7px', padding: '6px 14px', fontSize: '13px',
                cursor: 'pointer', fontFamily: FONT,
                border: showArchived ? '1px solid #374151' : '1px solid #e5e7eb',
                color: showArchived ? '#111827' : '#6b7280',
                background: showArchived ? '#f3f4f6' : '#fff',
                transition: 'all .12s',
              }}
            >
              Archives
            </button>
            {!showArchived && (
              <button
                onClick={() => navigate('/tickets/new')}
                style={{
                  background: '#1B5E20', color: '#fff', border: 'none',
                  borderRadius: '7px', padding: '6px 16px',
                  fontSize: '13px', cursor: 'pointer', fontFamily: FONT,
                }}
              >
                + Nouvelle DI
              </button>
            )}
          </div>
        }
      />
    }>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8f9fa', minHeight: '100%' }}>

        {/* ── Toolbar ── */}
        <div style={{
          background: '#fff', border: '1px solid #eaecf0', borderRadius: '12px',
          padding: '14px 16px', display: 'flex', alignItems: 'center',
          gap: '12px', flexWrap: 'wrap',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          {/* Recherche */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            border: '1px solid #e5e7eb', borderRadius: '8px',
            padding: '6px 12px', width: '260px', flexShrink: 0,
            background: '#fafafa',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{flexShrink:0}}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Titre, numéro, demandeur…"
              style={{
                border: 'none', outline: 'none', fontSize: '13px',
                color: '#374151', background: 'transparent', width: '100%',
                fontFamily: FONT,
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px', lineHeight: 1, padding: 0 }}>×</button>
            )}
          </div>

          {!showArchived && (
            <>
              <div style={{ width: '1px', height: '28px', background: '#e5e7eb', flexShrink: 0 }} />
              {/* Filtres statut */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {STATUS_FILTERS.map(f => {
                  const sm = STATUS_MAP[f.value]
                  return (
                    <Pill
                      key={f.value}
                      label={f.label}
                      active={statusFilter === f.value}
                      activeColor={sm?.color ?? '#1B5E20'}
                      activeBg={sm?.bg ?? '#1B5E20'}
                      onClick={() => { setStatusFilter(f.value); setPage(1) }}
                    />
                  )
                })}
              </div>
            </>
          )}

          <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#9ca3af', fontFamily: FONT, whiteSpace: 'nowrap' }}>
            {loading ? '…' : `${count} ticket${count > 1 ? 's' : ''}`}
          </span>
        </div>

        {/* ── Table card ── */}
        <div style={{
          background: '#fff', border: '1px solid #eaecf0',
          borderRadius: '12px', overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Numéro', 'Titre', 'Catégorie', 'Priorité', 'Statut', 'Demandeur', 'Créé le'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#d1d5db', padding: '40px', fontStyle: 'italic' }}>Chargement…</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#d1d5db', padding: '40px', fontStyle: 'italic' }}>Aucun ticket trouvé</td></tr>
              ) : tickets.map(t => (
                <TicketRow key={t.id} t={t} tdStyle={tdStyle} showArchived={showArchived} onClick={() => navigate(`/tickets/${t.id}`)} />
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
            <PageBtn label="←" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} />
            {buildPages(page, totalPages).map((n, i) =>
              n === '…'
                ? <span key={`d${i}`} style={{ padding: '0 4px', color: '#9ca3af', fontSize: '13px' }}>…</span>
                : <PageBtn key={n} label={n} active={page === n} onClick={() => setPage(n)} />
            )}
            <PageBtn label="→" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} />
          </div>
        )}

      </div>
    </AppLayout>
  )
}

function TicketRow({ t, tdStyle, showArchived, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ cursor: 'pointer', background: hov ? '#fafafa' : 'transparent', transition: 'background .1s' }}
    >
      <td style={{ ...tdStyle, color: '#9ca3af', fontFamily: 'ui-monospace, monospace', fontSize: '12px', letterSpacing: '0.04em' }}>
        {t.ticket_number}
      </td>
      <td style={{ ...tdStyle, fontWeight: '500', color: '#111827', fontSize: '13.5px', maxWidth: '240px' }}>
        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t.title}
        </span>
      </td>
      <td style={{ ...tdStyle, fontSize: '13px', color: '#6b7280' }}>
        {CATEGORY_MAP[t.category] ?? t.category}
      </td>
      <td style={tdStyle}>
        <PriorityBadge value={t.priority} />
      </td>
      <td style={tdStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <StatusBadge value={t.status} />
          {showArchived && (
            <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '5px', background: '#f3f4f6', color: '#6b7280', fontFamily: FONT }}>Archivé</span>
          )}
        </div>
      </td>
      <td style={{ ...tdStyle, fontSize: '13px', color: '#374151', fontWeight: '500' }}>
        {t.requester_name}
      </td>
      <td style={{ ...tdStyle, fontSize: '12.5px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
        {new Date(t.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
      </td>
    </tr>
  )
}
