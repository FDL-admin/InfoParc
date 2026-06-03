import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'
import { useDialog } from '../../context/DialogContext'

const FONT = "'Inter', system-ui, sans-serif"

// ── Maps ─────────────────────────────────────────────────────
const STATUS_MAP = {
  active:  { bg: '#dcfce7', color: '#166534', label: 'Actif' },
  broken:  { bg: '#fee2e2', color: '#991b1b', label: 'En panne' },
  repair:  { bg: '#fef3c7', color: '#92400e', label: 'En réparation' },
  retired: { bg: '#f3f4f6', color: '#6b7280', label: 'Mis au rebut' },
  stock:   { bg: '#e0f2fe', color: '#075985', label: 'En stock' },
}

const TYPE_MAP = {
  desktop: 'Desktop',
  laptop:  'Laptop',
  printer: 'Imprimante',
  scanner: 'Scanner',
  server:  'Serveur',
  network: 'Réseau',
  phone:   'Téléphone',
  other:   'Autre',
}

// ── Filtres ───────────────────────────────────────────────────
const TYPE_FILTERS = [
  { label: 'Tous',        value: '',        icon: null },
  { label: 'Desktop',     value: 'desktop', icon: 'desktop' },
  { label: 'Laptop',      value: 'laptop',  icon: 'laptop' },
  { label: 'Imprimante',  value: 'printer', icon: 'printer' },
  { label: 'Réseau',      value: 'network', icon: 'network' },
  { label: 'Serveur',     value: 'server',  icon: 'server' },
  { label: 'Scanner',     value: 'scanner', icon: 'scanner' },
]

const STATUS_FILTERS = [
  { label: 'Tous',           value: '' },
  { label: 'Actif',          value: 'active' },
  { label: 'En panne',       value: 'broken' },
  { label: 'En réparation',  value: 'repair' },
  { label: 'En stock',       value: 'stock' },
]

// ── Icônes type ───────────────────────────────────────────────
const TypeIcon = ({ type, size = 14 }) => {
  const p = { width: size, height: size, style: { flexShrink: 0 }, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.7' }
  switch (type) {
    case 'desktop': return <svg {...p}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
    case 'laptop':  return <svg {...p}><path d="M4 16V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10"/><path d="M2 16h20v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2z"/></svg>
    case 'printer': return <svg {...p}><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    case 'server':  return <svg {...p}><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><circle cx="6" cy="6" r="1" fill="currentColor"/><circle cx="6" cy="18" r="1" fill="currentColor"/></svg>
    case 'network': return <svg {...p}><rect x="2" y="9" width="20" height="6" rx="2"/><circle cx="6" cy="12" r="1" fill="currentColor"/><path d="M6 15v2M12 15v2M18 15v2"/></svg>
    case 'scanner': return <svg {...p}><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>
    default:        return <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
  }
}

// ── Composants UI ─────────────────────────────────────────────
function Badge({ value }) {
  const s = STATUS_MAP[value] ?? { bg: '#f3f4f6', color: '#6b7280', label: value }
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: '11.5px', padding: '3px 9px',
      borderRadius: '6px', fontWeight: '500',
      fontFamily: FONT, whiteSpace: 'nowrap',
      letterSpacing: '0.01em',
    }}>
      {s.label}
    </span>
  )
}

function WarrantyCell({ date }) {
  if (!date) return <span style={{ color: '#d1d5db', fontSize: '13px' }}>—</span>
  const d    = new Date(date)
  const now  = new Date()
  const days = Math.ceil((d - now) / 86400000)
  const fmt  = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  if (days < 0)   return <span style={{ color: '#dc2626', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: 4 }}><WarnIcon /> {fmt}</span>
  if (days <= 60) return <span style={{ color: '#d97706', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: 4 }}><WarnIcon color="#d97706"/> {fmt}</span>
  return <span style={{ color: '#6b7280', fontSize: '12.5px' }}>{fmt}</span>
}

const WarnIcon = ({ color = '#dc2626' }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={{ flexShrink: 0 }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)

// ── Toolbar Button (type pills) ───────────────────────────────
function TypePill({ label, icon, active, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '5px 11px', borderRadius: '7px',
        fontSize: '13px', fontFamily: FONT,
        border: active ? '1.5px solid #1B5E20' : '1px solid #e5e7eb',
        background: active ? '#1B5E20' : hov ? '#f9fafb' : '#fff',
        color: active ? '#fff' : '#374151',
        cursor: 'pointer', transition: 'all .12s',
        whiteSpace: 'nowrap', letterSpacing: '0.01em',
      }}
    >
      {icon && <TypeIcon type={icon} size={13} />}
      {label}
    </button>
  )
}

function StatusPill({ label, value, active, onClick }) {
  const [hov, setHov] = useState(false)
  const map = STATUS_MAP[value]
  const activeBg    = map?.color ?? '#374151'
  const activeBorder= map?.color ?? '#374151'
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '5px 11px', borderRadius: '7px',
        fontSize: '13px', fontFamily: FONT,
        border: active ? `1.5px solid ${activeBorder}` : '1px solid #e5e7eb',
        background: active ? (map?.bg ?? '#f3f4f6') : hov ? '#f9fafb' : '#fff',
        color: active ? activeBg : '#374151',
        cursor: 'pointer', transition: 'all .12s',
        whiteSpace: 'nowrap', fontWeight: active ? '600' : '400',
        letterSpacing: '0.01em',
      }}
    >
      {label}
    </button>
  )
}

// ── Page ─────────────────────────────────────────────────────
export default function EquipmentList() {
  const [equipment, setEquipment] = useState([])
  const [count,     setCount]     = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [typeFilter,   setTypeFilter]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page,      setPage]      = useState(1)
  const [scanning,  setScanning]  = useState(false)
  const navigate = useNavigate()
  const { confirm, toast } = useDialog()
  const PAGE_SIZE = 20

  const fetch = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search)      p.append('search', search)
    if (typeFilter)  p.append('type', typeFilter)
    if (statusFilter)p.append('status', statusFilter)
    p.append('page', page)
    api.get(`/equipment/?${p}`)
      .then(r => { setEquipment(r.data.results ?? r.data); setCount(r.data.count ?? 0) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [typeFilter, statusFilter, page])
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetch() }, 380)
    return () => clearTimeout(t)
  }, [search])

  const handleScan = async () => {
    const ok = await confirm({ title: 'Scan réseau', message: 'Lancer un scan du réseau 192.168.11.0/24 ? Cette opération peut prendre quelques instants.', confirmLabel: 'Lancer le scan' })
    if (!ok) return
    setScanning(true)
    try {
      const r = await api.post('/equipment/discover/')
      const { summary } = r.data
      toast({ title: 'Scan terminé', message: `${summary.hosts_found} hôtes détectés · ${summary.created} nouveaux · ${summary.skipped} déjà enregistrés`, variant: 'success', duration: 6000 })
      fetch()
    } catch (err) {
      const msg = err.response?.data?.detail ?? 'Erreur lors du scan réseau.'
      toast({ title: 'Scan échoué', message: msg, variant: 'danger', duration: 6000 })
    } finally { setScanning(false) }
  }

  const totalPages = Math.ceil(count / PAGE_SIZE)

  const thStyle = {
    textAlign: 'left', padding: '11px 16px',
    fontSize: '11px', color: '#9ca3af',
    fontWeight: '600', fontFamily: FONT,
    borderBottom: '1px solid #f3f4f6',
    whiteSpace: 'nowrap', background: '#fafafa',
    letterSpacing: '0.07em', textTransform: 'uppercase',
  }
  const tdStyle = {
    padding: '12px 16px',
    borderBottom: '1px solid #f3f4f6',
    fontFamily: FONT, verticalAlign: 'middle',
  }

  return (
    <AppLayout topbar={
      <TopBar
        title="Équipements"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleScan}
              disabled={scanning}
              style={{
                background: '#fff', color: '#1B5E20',
                border: '1px solid #1B5E20', borderRadius: '7px',
                padding: '6px 14px', fontSize: '13px',
                cursor: scanning ? 'not-allowed' : 'pointer',
                fontFamily: FONT, letterSpacing: '0.01em',
                display: 'flex', alignItems: 'center', gap: '7px',
                opacity: scanning ? 0.7 : 1,
              }}
            >
              {scanning ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Scan en cours…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  Scan réseau
                </>
              )}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </button>
            <button
              onClick={() => navigate('/equipment/new')}
              style={{
                background: '#1B5E20', color: '#fff', border: 'none',
                borderRadius: '7px', padding: '6px 16px',
                fontSize: '13px', cursor: 'pointer',
                fontFamily: FONT, letterSpacing: '0.01em',
              }}
            >
              + Ajouter
            </button>
          </div>
        }
      />
    }>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8f9fa', minHeight: '100%' }}>

        {/* ── Toolbar ── */}
        <div style={{
          background: '#fff', border: '1px solid #eaecf0',
          borderRadius: '12px', padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: '12px',
          flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>

          {/* Recherche */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            border: '1px solid #e5e7eb', borderRadius: '8px',
            padding: '6px 12px', width: '280px', flexShrink: 0,
            background: '#fafafa',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Nom, N° série, marque…"
              style={{
                border: 'none', outline: 'none', fontSize: '13.5px',
                color: '#374151', background: 'transparent', width: '100%',
                fontFamily: FONT,
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px', lineHeight: 1, padding: 0 }}>×</button>
            )}
          </div>

          {/* Séparateur */}
          <div style={{ width: '1px', height: '28px', background: '#e5e7eb', flexShrink: 0 }} />

          {/* Filtres type */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {TYPE_FILTERS.map(f => (
              <TypePill
                key={f.value}
                label={f.label}
                icon={f.icon}
                active={typeFilter === f.value}
                onClick={() => { setTypeFilter(f.value); setPage(1) }}
              />
            ))}
          </div>

          {/* Séparateur */}
          <div style={{ width: '1px', height: '28px', background: '#e5e7eb', flexShrink: 0 }} />

          {/* Filtres statut */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {STATUS_FILTERS.map(f => (
              <StatusPill
                key={f.value}
                label={f.label}
                value={f.value}
                active={statusFilter === f.value}
                onClick={() => { setStatusFilter(f.value); setPage(1) }}
              />
            ))}
          </div>

          {/* Compteur à droite */}
          <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#9ca3af', fontFamily: FONT, whiteSpace: 'nowrap' }}>
            {loading ? '…' : `${count} résultat${count > 1 ? 's' : ''}`}
          </span>
        </div>

        {/* ── Bannière scan en cours ── */}
        {scanning && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: '10px', padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: '10px',
            fontSize: '13px', color: '#166534', fontFamily: FONT,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"
              style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Scan du réseau en cours…
          </div>
        )}

        {/* ── Table card ── */}
        <div style={{
          background: '#fff', border: '1px solid #eaecf0',
          borderRadius: '12px', overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          opacity: scanning ? 0.5 : 1,
          transition: 'opacity .3s',
          pointerEvents: scanning ? 'none' : 'auto',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Nom', 'Type', 'Marque / Modèle', 'N° série', 'Département', 'Affecté à', 'Statut', 'Garantie'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#d1d5db', padding: '40px', fontStyle: 'italic' }}>
                  Chargement…
                </td></tr>
              ) : equipment.length === 0 ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#d1d5db', padding: '40px', fontStyle: 'italic' }}>
                  Aucun équipement trouvé
                </td></tr>
              ) : equipment.map(eq => (
                <EquipmentRow key={eq.id} eq={eq} tdStyle={tdStyle} onClick={() => navigate(`/equipment/${eq.id}`)} />
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
            <PageBtn
              label="←"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            />
            {buildPageNumbers(page, totalPages).map((n, i) =>
              n === '…'
                ? <span key={`d${i}`} style={{ padding: '0 4px', color: '#9ca3af', fontSize: '13px' }}>…</span>
                : <PageBtn key={n} label={n} active={page === n} onClick={() => setPage(n)} />
            )}
            <PageBtn
              label="→"
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            />
          </div>
        )}

      </div>
    </AppLayout>
  )
}

// ── Ligne équipement ──────────────────────────────────────────
function EquipmentRow({ eq, tdStyle, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ cursor: 'pointer', background: hov ? '#fafafa' : 'transparent', transition: 'background .1s' }}
    >
      <td style={{ ...tdStyle, fontWeight: '500', color: '#111827', fontSize: '13.5px' }}>
        {eq.name}
      </td>
      <td style={{ ...tdStyle, color: '#6b7280', fontSize: '13px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TypeIcon type={eq.type} size={13} />
          {TYPE_MAP[eq.type] ?? eq.type}
        </span>
      </td>
      <td style={{ ...tdStyle, color: '#6b7280', fontSize: '13px' }}>
        {[eq.brand, eq.model].filter(Boolean).join(' ') || '—'}
      </td>
      <td style={{ ...tdStyle, color: '#9ca3af', fontFamily: 'ui-monospace, monospace', fontSize: '11.5px', letterSpacing: '0.06em' }}>
        {eq.serial_number || '—'}
      </td>
      <td style={{ ...tdStyle, color: '#6b7280', fontSize: '13px' }}>
        {eq.department_name || '—'}
      </td>
      <td style={{ ...tdStyle, color: '#374151', fontSize: '13px', fontWeight: '500' }}>
        {eq.assigned_to_name || <span style={{ color: '#d1d5db' }}>—</span>}
      </td>
      <td style={tdStyle}>
        <Badge value={eq.status} />
      </td>
      <td style={tdStyle}>
        <WarrantyCell date={eq.warranty_end_date} />
      </td>
    </tr>
  )
}

// ── Bouton pagination ─────────────────────────────────────────
function PageBtn({ label, active, disabled, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        minWidth: '32px', height: '32px', padding: '0 8px',
        border: active ? '1.5px solid #1B5E20' : '1px solid #e5e7eb',
        borderRadius: '7px',
        background: active ? '#1B5E20' : hov && !disabled ? '#f9fafb' : '#fff',
        color: active ? '#fff' : disabled ? '#d1d5db' : '#374151',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '13px', fontFamily: FONT,
        transition: 'all .12s',
      }}
    >
      {label}
    </button>
  )
}

// ── Utilitaire pagination ─────────────────────────────────────
function buildPageNumbers(current, total) {
  const pages = []
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 1) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }
  return pages
}

