import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend,
} from 'recharts'
import AppLayout from '../components/layout/AppLayout'
import TopBar from '../components/layout/TopBar'
import api from '../api/axios'

const FONT = "'Inter', system-ui, sans-serif"

const CARD = {
  background: '#fff',
  border: '1px solid #eaecf0',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  fontFamily: FONT,
}

// ── Badge maps ────────────────────────────────────────────────
const statusMap = {
  open:        { bg: '#E6F1FB', color: '#185FA5', label: 'Ouvert' },
  assigned:    { bg: '#EEEDFE', color: '#3C3489', label: 'Assigné' },
  in_progress: { bg: '#FEF3C7', color: '#92400E', label: 'En cours' },
  waiting:     { bg: '#F3F4F6', color: '#6B7280', label: 'En attente' },
  resolved:    { bg: '#D1FAE5', color: '#065F46', label: 'Résolu' },
  closed:      { bg: '#F3F4F6', color: '#374151', label: 'Fermé' },
}
const priorityMap = {
  critical: { bg: '#FEE2E2', color: '#991B1B', label: 'Critique' },
  high:     { bg: '#FEF3C7', color: '#92400E', label: 'Haute' },
  normal:   { bg: '#F3F4F6', color: '#6B7280', label: 'Normale' },
  low:      { bg: '#E0F2FE', color: '#0369A1', label: 'Basse' },
}

const TYPE_COLORS = ['#1B5E20', '#2E7D32', '#388E3C', '#43A047', '#66BB6A', '#81C784']

// ── Génération des 12 dernières semaines et fusion des séries ─
function buildChartData(createdByWeek, resolvedByWeek) {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const lastMonday = new Date(now)
  lastMonday.setDate(now.getDate() - daysToMonday)

  const weeks = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(lastMonday)
    d.setDate(lastMonday.getDate() - i * 7)
    const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    weeks.push({ week: label, Créés: 0, Résolus: 0 })
  }
  ;(createdByWeek ?? []).forEach(({ week, count }) => {
    const e = weeks.find(w => w.week === week)
    if (e) e.Créés = count
  })
  ;(resolvedByWeek ?? []).forEach(({ week, count }) => {
    const e = weeks.find(w => w.week === week)
    if (e) e.Résolus = count
  })
  return weeks
}

// ── Icônes SVG ────────────────────────────────────────────────
const Icons = {
  equipment: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    </svg>
  ),
  ticket: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  contract: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  star: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  alert: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
}

// ── Composants réutilisables ───────────────────────────────────
function Badge({ value, map }) {
  const s = map[value] ?? { bg: '#F3F4F6', color: '#6B7280', label: value }
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: '11px', padding: '2px 8px',
      borderRadius: '5px', fontWeight: '500',
      fontFamily: FONT, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

function StatCard({ label, value, sub, icon, iconBg = '#f0fdf4', iconColor = '#1B5E20', onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...CARD,
        padding: '20px 22px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow .15s, border-color .15s',
        boxShadow: hov && onClick ? '0 4px 14px rgba(27,94,32,0.09)' : CARD.boxShadow,
        borderColor: hov && onClick ? '#b6ceb6' : '#eaecf0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <span style={{ fontSize: '13px', color: '#6b7280', letterSpacing: '0.01em' }}>{label}</span>
        <div style={{
          width: '34px', height: '34px', borderRadius: '9px',
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: iconColor, flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '32px', fontWeight: '600', color: '#111', lineHeight: 1, marginBottom: '6px' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '12px', color: '#b0b8c4' }}>{sub}</div>}
    </div>
  )
}

function SectionCard({ title, subtitle, action, children, style = {} }) {
  return (
    <div style={{ ...CARD, padding: '22px 24px', ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#111', letterSpacing: '0.01em' }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: '12px', color: '#b0b8c4', marginTop: '3px', fontStyle: 'italic' }}>{subtitle}</div>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #eaecf0',
      borderRadius: '8px', padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      fontFamily: FONT, fontSize: '13px',
    }}>
      <div style={{ color: '#9ca3af', marginBottom: '7px', fontSize: '12px' }}>
        Semaine du {label}
      </div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: '#374151' }}>{p.name} : <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  )
}

function TicketRow({ t, onClick }) {
  const [hov, setHov] = useState(false)
  const tdStyle = { padding: '9px 8px', borderBottom: '1px solid #f9fafb', verticalAlign: 'middle' }
  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ cursor: 'pointer', background: hov ? '#fafafa' : 'transparent', transition: 'background .1s' }}
    >
      <td style={{ ...tdStyle, color: '#9ca3af', fontSize: '12px' }}>{t.ticket_number}</td>
      <td style={{ ...tdStyle, fontSize: '13.5px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {t.title}
      </td>
      <td style={tdStyle}><Badge value={t.priority} map={priorityMap} /></td>
      <td style={tdStyle}><Badge value={t.status} map={statusMap} /></td>
    </tr>
  )
}

function AlertRow({ a, onClick }) {
  const [hov, setHov] = useState(false)
  const isError = a.type === 'contract_expiry'
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        padding: '9px 12px', borderRadius: '8px',
        fontSize: '13.5px', cursor: 'pointer',
        background: hov ? '#fafafa' : 'transparent',
        transition: 'background .1s',
        color: '#374151',
      }}
    >
      <span style={{ color: isError ? '#dc2626' : '#d97706', marginTop: '2px', flexShrink: 0 }}>
        {Icons.alert}
      </span>
      <span>{a.message}</span>
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <AppLayout>
        <div style={{ padding: '2rem', color: '#1B5E20', fontFamily: FONT }}>Chargement…</div>
      </AppLayout>
    )
  }

  const eq      = data?.equipment ?? {}
  const tk      = data?.tickets   ?? {}
  const alerts  = data?.alerts    ?? []
  const byType  = (eq.by_type ?? []).map(item => ({ name: item.type, Qté: item.count }))
  const chartData = buildChartData(tk.created_by_week, tk.resolved_by_week)

  const axisProps = {
    tick: { fontSize: 11, fontFamily: FONT, fill: '#b0b8c4' },
    axisLine: false,
    tickLine: false,
  }

  return (
    <AppLayout topbar={<TopBar title="Dashboard" />}>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#f8f9fa', minHeight: '100%' }}>

        {/* ── Ligne de stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <StatCard
            label="Équipements total"
            value={eq.total ?? 0}
            sub={`${eq.active ?? 0} actifs · ${eq.stock ?? 0} en stock`}
            icon={Icons.equipment}
            onClick={() => navigate('/equipment')}
          />
          <StatCard
            label="Tickets ouverts"
            value={tk.open ?? 0}
            sub={`${tk.in_progress ?? 0} en cours de traitement`}
            icon={Icons.ticket}
            iconBg="#fff0f6"
            iconColor="#C62828"
            onClick={() => navigate('/tickets?status=open')}
          />
          <StatCard
            label="Contrats expirant"
            value={data?.contracts?.expiring_soon ?? 0}
            sub="dans les 30 prochains jours"
            icon={Icons.contract}
            iconBg="#fffbeb"
            iconColor="#d97706"
            onClick={() => navigate('/contracts?expiring_soon=true')}
          />
          <StatCard
            label="Satisfaction"
            value={data?.satisfaction?.average ? `${data.satisfaction.average}/5` : '—'}
            sub="note moyenne sur les évaluations"
            icon={Icons.star}
            iconBg="#fdf4ff"
            iconColor="#9333ea"
            onClick={() => navigate('/tickets?status=resolved')}
          />
        </div>

        {/* ── Graphique évolution interventions (pleine largeur) ── */}
        <SectionCard
          title="Évolution des interventions"
          subtitle="Tickets créés et résolus par semaine — 12 dernières semaines"
        >
          <ResponsiveContainer width="100%" height={270}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gCrees" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1B5E20" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#1B5E20" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="gResolus" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" stroke="#f0f2f5" vertical={false} />
              <XAxis dataKey="week" {...axisProps} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontFamily: FONT, fontSize: '13px', paddingTop: '14px', color: '#6b7280' }}
              />
              <Area
                type="monotone"
                dataKey="Créés"
                stroke="#1B5E20"
                strokeWidth={2}
                fill="url(#gCrees)"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0, fill: '#1B5E20' }}
              />
              <Area
                type="monotone"
                dataKey="Résolus"
                stroke="#0ea5e9"
                strokeWidth={2}
                fill="url(#gResolus)"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0, fill: '#0ea5e9' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* ── Ligne : Tickets récents + Équipements par type ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px' }}>

          {/* Tickets récents */}
          <SectionCard
            title="Tickets récents"
            subtitle="Derniers tickets en attente de traitement"
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
              <thead>
                <tr>
                  {['Numéro', 'Titre', 'Priorité', 'Statut'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '4px 8px 12px',
                      fontSize: '12px', color: '#b0b8c4',
                      fontWeight: '400', borderBottom: '1px solid #f3f4f6',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(tk.latest_open ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px 8px', color: '#d1d5db', fontSize: '13px', fontStyle: 'italic' }}>
                      Aucun ticket ouvert en ce moment
                    </td>
                  </tr>
                ) : (
                  (tk.latest_open ?? []).map(t => (
                    <TicketRow key={t.id} t={t} onClick={() => navigate(`/tickets/${t.id}`)} />
                  ))
                )}
              </tbody>
            </table>
          </SectionCard>

          {/* Équipements par type */}
          <SectionCard title="Équipements par type" subtitle="Répartition du parc matériel">
            {byType.length === 0 ? (
              <div style={{ color: '#d1d5db', fontSize: '13px', fontStyle: 'italic' }}>
                Aucune donnée disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byType} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 4" stroke="#f0f2f5" vertical={false} />
                  <XAxis dataKey="name" {...axisProps} />
                  <YAxis {...axisProps} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(27,94,32,0.04)' }}
                    contentStyle={{
                      fontFamily: FONT, fontSize: '13px',
                      border: '1px solid #eaecf0', borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    }}
                  />
                  <Bar dataKey="Qté" radius={[5, 5, 0, 0]}>
                    {byType.map((_, i) => (
                      <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </div>

        {/* ── Alertes ── */}
        <SectionCard
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Alertes
              {alerts.length > 0 && (
                <span style={{
                  background: '#FEE2E2', color: '#991B1B',
                  fontSize: '11px', padding: '2px 8px',
                  borderRadius: '10px', fontWeight: '500',
                }}>
                  {alerts.length} en attente
                </span>
              )}
            </span>
          }
        >
          {alerts.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#d1d5db', fontStyle: 'italic', padding: '4px 0' }}>
              Aucune alerte en attente
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', margin: '0 -12px' }}>
              {alerts.slice(0, 6).map((a, i) => (
                <AlertRow key={a.id ?? i} a={a} onClick={() => navigate('/contracts')} />
              ))}
            </div>
          )}
        </SectionCard>

      </div>
    </AppLayout>
  )
}



