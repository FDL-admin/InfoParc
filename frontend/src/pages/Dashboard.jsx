import { useEffect, useState } from 'react'
import AppLayout from '../components/layout/AppLayout'
import TopBar from '../components/layout/TopBar'
import api from '../api/axios'

const badge = {
  open:        { bg: '#E6F1FB', color: '#185FA5' },
  assigned:    { bg: '#EEEDFE', color: '#3C3489' },
  in_progress: { bg: '#FAEEDA', color: '#633806' },
  waiting:     { bg: '#F1EFE8', color: '#5F5E5A' },
  resolved:    { bg: '#EAF3DE', color: '#27500A' },
  closed:      { bg: '#F1EFE8', color: '#444441' },
}

const priorityBadge = {
  critical: { bg: '#FCEBEB', color: '#791F1F', label: 'Critique' },
  high:     { bg: '#FAEEDA', color: '#633806', label: 'Haute' },
  normal:   { bg: '#F1EFE8', color: '#5F5E5A', label: 'Normale' },
  low:      { bg: '#E6F1FB', color: '#185FA5', label: 'Basse' },
}

function Badge({ value, map, fallback }) {
  const style = map[value] ?? { bg: '#F1EFE8', color: '#444441' }
  return (
    <span style={{
      background: style.bg, color: style.color,
      fontSize: '11px', padding: '2px 7px',
      borderRadius: '4px', fontWeight: '500',
    }}>
      {style.label ?? value}
    </span>
  )
}

function StatCard({ label, value, sub, accentColor }) {
  return (
    <div style={{
      background: '#fff', border: '0.5px solid #e0e0e0',
      borderRadius: '8px', padding: '12px 16px',
    }}>
      <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: '500', color: accentColor ?? '#1B5E20' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{sub}</div>}
    </div>
  )
}

function Card({ title, children, action }) {
  return (
    <div style={{
      background: '#fff', border: '0.5px solid #e0e0e0',
      borderRadius: '8px', padding: '14px 16px',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '12px',
      }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#222' }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <AppLayout>
      <div style={{ padding: '2rem', color: '#1B5E20' }}>Chargement...</div>
    </AppLayout>
  )

  const eq = data?.equipment ?? {}
  const tk = data?.tickets ?? {}
  const alerts = data?.alerts ?? []

  return (
      <AppLayout topbar={<TopBar title="Dashboard" />}>
        <div style={{ padding: '16px' }}>

        {/* Ligne stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <StatCard
            label="Équipements total"
            value={eq.total ?? 0}
            sub={`${eq.stock ?? 0} en stock`}
          />
          <StatCard
            label="Tickets ouverts"
            value={tk.open ?? 0}
            sub={`${tk.in_progress ?? 0} en cours`}
            accentColor="#C2185B"
          />
          <StatCard
            label="Contrats expirant"
            value={data?.contracts?.expiring_soon ?? 0}
            sub="dans 30 jours"
            accentColor="#BA7517"
          />
          <StatCard
            label="Satisfaction"
            value={data?.satisfaction?.average
              ? `${data.satisfaction.average}/5`
              : '—'}
            sub="moyenne évaluations"
          />
        </div>

        {/* Ligne centrale */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

          {/* Tickets récents */}
          <Card title="Tickets récents">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  {['Numéro', 'Titre', 'Priorité', 'Statut'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '4px 6px',
                      color: '#888', fontWeight: '400',
                      borderBottom: '0.5px solid #eee',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(tk.latest_open ?? []).length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: '12px 6px', color: '#aaa', fontSize: '12px' }}>
                    Aucun ticket ouvert
                  </td></tr>
                ) : (
                  (tk.latest_open ?? []).map(t => (
                    <tr key={t.id}>
                      <td style={{ padding: '6px 6px', borderBottom: '0.5px solid #f5f5f5', color: '#666' }}>
                        {t.ticket_number}
                      </td>
                      <td style={{ padding: '6px 6px', borderBottom: '0.5px solid #f5f5f5' }}>
                        {t.title.length > 28 ? t.title.slice(0, 28) + '…' : t.title}
                      </td>
                      <td style={{ padding: '6px 6px', borderBottom: '0.5px solid #f5f5f5' }}>
                        <Badge value={t.priority} map={priorityBadge} />
                      </td>
                      <td style={{ padding: '6px 6px', borderBottom: '0.5px solid #f5f5f5' }}>
                        <Badge value={t.status} map={badge} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          {/* Équipements par type */}
          <Card title="Équipements par type">
            {(eq.by_type ?? []).length === 0 ? (
              <div style={{ color: '#aaa', fontSize: '12px' }}>Aucune donnée</div>
            ) : (
              eq.by_type.map(item => {
                const pct = eq.total > 0
                  ? Math.round((item.count / eq.total) * 100)
                  : 0
                return (
                  <div key={item.type} style={{
                    display: 'flex', alignItems: 'center',
                    gap: '8px', marginBottom: '8px',
                  }}>
                    <div style={{ width: '70px', fontSize: '11px', color: '#666', flexShrink: 0 }}>
                      {item.type}
                    </div>
                    <div style={{
                      flex: 1, height: '6px', background: '#f0f0f0',
                      borderRadius: '3px', overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${pct}%`, height: '100%',
                        background: '#1B5E20', borderRadius: '3px',
                      }} />
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', width: '24px', textAlign: 'right' }}>
                      {item.count}
                    </div>
                  </div>
                )
              })
            )}
          </Card>
        </div>

        {/* Alertes */}
        <Card title={
          <span>
            Alertes
            {(data?.alerts_count ?? 0) > 0 && (
              <span style={{
                marginLeft: '8px', background: '#FCEBEB', color: '#791F1F',
                fontSize: '10px', padding: '2px 7px', borderRadius: '10px',
              }}>
                {data.alerts_count} en attente
              </span>
            )}
          </span>
        }>
          {alerts.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#aaa' }}>Aucune alerte en attente</div>
          ) : (
            alerts.slice(0, 5).map(a => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '6px 0', borderBottom: '0.5px solid #f5f5f5',
                fontSize: '12px',
              }}>
                <div style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: a.type === 'contract_expiry' ? '#E24B4A' : '#BA7517',
                  flexShrink: 0,
                }} />
                {a.message}
              </div>
            ))
          )}
        </Card>

      </div>
    </AppLayout>
  )
}