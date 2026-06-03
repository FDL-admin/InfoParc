import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'

const FONT = "'Inter', system-ui, sans-serif"

const STATUS_MAP = {
  active:    { bg: '#dcfce7', color: '#166534', label: 'Actif' },
  expired:   { bg: '#fee2e2', color: '#991b1b', label: 'Expiré' },
  pending:   { bg: '#fef3c7', color: '#92400e', label: 'En attente' },
  cancelled: { bg: '#f3f4f6', color: '#6b7280', label: 'Résilié' },
}

const TYPE_MAP = {
  warranty:    'Garantie',
  maintenance: 'Maintenance',
  support:     'Support',
  lease:       'Leasing',
  other:       'Autre',
}

const TYPE_ICONS = {
  warranty:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{flexShrink:0}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  maintenance: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{flexShrink:0}}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  support:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  lease:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{flexShrink:0}}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  other:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
}

const TYPE_FILTERS = [
  { label: 'Tous',        value: '' },
  { label: 'Garantie',    value: 'warranty' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Support',     value: 'support' },
  { label: 'Leasing',     value: 'lease' },
]

function daysUntil(d) { return Math.ceil((new Date(d) - new Date()) / 86400000) }
function fmtDate(d)    { return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' }) }

// ── Composants ────────────────────────────────────────────────
function Badge({ value }) {
  const s = STATUS_MAP[value] ?? { bg: '#f3f4f6', color: '#6b7280', label: value }
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: '11.5px', padding: '3px 9px',
      borderRadius: '6px', fontWeight: '500',
      fontFamily: FONT, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

function ExpiryCell({ days }) {
  if (days < 0)   return <span style={{ color: '#991b1b', fontSize: '12.5px', fontWeight: '500' }}>Expiré il y a {Math.abs(days)}j</span>
  if (days <= 30) return <span style={{ color: '#d97706', fontSize: '12.5px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 4 }}><WarnIcon color="#d97706"/> {days}j restants</span>
  return <span style={{ color: '#6b7280', fontSize: '12.5px' }}>{days}j</span>
}

const WarnIcon = ({ color = '#dc2626' }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={{flexShrink:0}}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)

function Pill({ label, icon, active, activeColor, activeBg, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '5px 11px', borderRadius: '7px', cursor: 'pointer',
        fontSize: '13px', fontFamily: FONT, whiteSpace: 'nowrap',
        border: active ? `1.5px solid ${activeColor ?? '#1B5E20'}` : '1px solid #e5e7eb',
        background: active ? (activeBg ?? '#1B5E20') : hov ? '#f9fafb' : '#fff',
        color: active ? (activeBg ? activeColor : '#fff') : '#374151',
        fontWeight: active ? '500' : '400',
        transition: 'all .12s',
      }}
    >
      {icon}
      {label}
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
export default function ContractList() {
  const navigate = useNavigate()
  const [contracts,    setContracts]    = useState([])
  const [count,        setCount]        = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [typeFilter,   setTypeFilter]   = useState('')
  const [showExpiring, setShowExpiring] = useState(false)
  const [page,         setPage]         = useState(1)
  const PAGE_SIZE = 20

  const fetch = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (typeFilter)   p.append('type', typeFilter)
    if (showExpiring) p.append('expiring_soon', 'true')
    p.append('page', page)
    api.get(`/contracts/?${p}`)
      .then(r => { setContracts(r.data.results ?? r.data); setCount(r.data.count ?? 0) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [typeFilter, showExpiring, page])

  const totalPages = Math.ceil(count / PAGE_SIZE)

  return (
    <AppLayout topbar={
      <TopBar
        title="Contrats & Garanties"
        actions={
          <button
            onClick={() => navigate('/contracts/new')}
            style={{
              background: '#1B5E20', color: '#fff', border: 'none',
              borderRadius: '7px', padding: '6px 16px',
              fontSize: '13px', cursor: 'pointer', fontFamily: FONT,
            }}
          >
            + Nouveau contrat
          </button>
        }
      />
    }>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8f9fa', minHeight: '100%' }}>

        {/* ── Toolbar ── */}
        <div style={{
          background: '#fff', border: '1px solid #eaecf0', borderRadius: '12px',
          padding: '14px 16px', display: 'flex', alignItems: 'center',
          gap: '10px', flexWrap: 'wrap',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          {/* Filtres type */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {TYPE_FILTERS.map(f => (
              <Pill
                key={f.value}
                label={f.label}
                icon={f.value ? TYPE_ICONS[f.value] : null}
                active={typeFilter === f.value}
                onClick={() => { setTypeFilter(f.value); setPage(1) }}
              />
            ))}
          </div>

          <div style={{ width: '1px', height: '28px', background: '#e5e7eb', flexShrink: 0 }} />

          {/* Toggle expirant bientôt */}
          <Pill
            label="Expirant bientôt"
            icon={<WarnIcon color={showExpiring ? '#d97706' : '#9ca3af'} />}
            active={showExpiring}
            activeColor="#d97706"
            activeBg="#fef3c7"
            onClick={() => { setShowExpiring(e => !e); setPage(1) }}
          />

          <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#9ca3af', fontFamily: FONT, whiteSpace: 'nowrap' }}>
            {loading ? '…' : `${count} contrat${count > 1 ? 's' : ''}`}
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
                {['Nom', 'Type', 'Équipement', 'Fournisseur', 'Début', 'Fin', 'Expire dans', 'Statut'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#d1d5db', padding: '40px', fontStyle: 'italic' }}>Chargement…</td></tr>
              ) : contracts.length === 0 ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#d1d5db', padding: '40px', fontStyle: 'italic' }}>Aucun contrat trouvé</td></tr>
              ) : contracts.map(c => (
                <ContractRow key={c.id} c={c} tdStyle={tdStyle} onClick={() => navigate(`/contracts/${c.id}`)} />
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

function ContractRow({ c, tdStyle, onClick }) {
  const [hov, setHov] = useState(false)
  const days = daysUntil(c.end_date)
  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ cursor: 'pointer', background: hov ? '#fafafa' : 'transparent', transition: 'background .1s' }}
    >
      <td style={{ ...tdStyle, fontWeight: '500', color: '#111827', fontSize: '13.5px' }}>{c.name}</td>
      <td style={{ ...tdStyle, fontSize: '13px', color: '#6b7280' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {TYPE_ICONS[c.type]}
          {TYPE_MAP[c.type] ?? c.type}
        </span>
      </td>
      <td style={{ ...tdStyle, fontSize: '13px', color: '#6b7280' }}>{c.equipment_name || '—'}</td>
      <td style={{ ...tdStyle, fontSize: '13px', color: '#6b7280' }}>{c.supplier_name || <span style={{color:'#d1d5db'}}>—</span>}</td>
      <td style={{ ...tdStyle, fontSize: '12.5px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{fmtDate(c.start_date)}</td>
      <td style={{ ...tdStyle, fontSize: '12.5px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{fmtDate(c.end_date)}</td>
      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}><ExpiryCell days={days} /></td>
      <td style={tdStyle}><Badge value={c.status} /></td>
    </tr>
  )
}
