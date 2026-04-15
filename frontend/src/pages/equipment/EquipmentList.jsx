import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import api from '../../api/axios'

const STATUS_MAP = {
  active:  { bg: '#EAF3DE', color: '#27500A', label: 'Actif' },
  broken:  { bg: '#FCEBEB', color: '#791F1F', label: 'En panne' },
  repair:  { bg: '#FAEEDA', color: '#633806', label: 'En réparation' },
  retired: { bg: '#F1EFE8', color: '#5F5E5A', label: 'Mis au rebut' },
  stock:   { bg: '#E6F1FB', color: '#185FA5', label: 'En stock' },
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

const TYPE_FILTERS = [
  { label: 'Tous', value: '' },
  { label: 'Desktop', value: 'desktop' },
  { label: 'Laptop', value: 'laptop' },
  { label: 'Imprimante', value: 'printer' },
  { label: 'Réseau', value: 'network' },
  { label: 'Serveur', value: 'server' },
]

const STATUS_FILTERS = [
  { label: 'Tous statuts', value: '' },
  { label: 'Actif', value: 'active' },
  { label: 'En panne', value: 'broken' },
  { label: 'En réparation', value: 'repair' },
  { label: 'En stock', value: 'stock' },
]

export default function EquipmentList() {
  const [equipment, setEquipment] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [scanning, setScanning] = useState(false)
  const navigate = useNavigate()


  const PAGE_SIZE = 20

  const fetchEquipment = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (typeFilter) params.append('type', typeFilter)
    if (statusFilter) params.append('status', statusFilter)
    params.append('page', page)

    api.get(`/equipment/?${params.toString()}`)
      .then(res => {
        setEquipment(res.data.results ?? res.data)
        setCount(res.data.count ?? 0)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchEquipment()
  }, [typeFilter, statusFilter, page])

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      fetchEquipment()
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  const handleScan = async () => {
    if (!confirm('Lancer un scan du réseau 192.168.11.0/24 ?')) return
    setScanning(true)
    try {
      const res = await api.post('/equipment/discover/')
      const { summary, created } = res.data
      alert(`Scan terminé.\n${summary.hosts_found} hôtes détectés\n${summary.created} nouveaux équipements créés\n${summary.skipped} déjà enregistrés`)
      fetchEquipment()
    } catch {
      alert('Erreur lors du scan réseau.')
    } finally {
      setScanning(false)
    }
  }

  const totalPages = Math.ceil(count / PAGE_SIZE)

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
                border: '0.5px solid #1B5E20',
                borderRadius: '6px', padding: '7px 14px',
                fontSize: '12px', cursor: scanning ? 'not-allowed' : 'pointer',
              }}
            >
              {scanning ? 'Scan en cours...' : 'Scan réseau'}
            </button>
            <button
              onClick={() => navigate('/equipment/new')}
              style={{
                background: '#C2185B', color: '#fff', border: 'none',
                borderRadius: '6px', padding: '7px 14px',
                fontSize: '12px', cursor: 'pointer',
              }}
            >
              + Ajouter
            </button>
          </div>
        }
      />
    }>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Recherche */}
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
            placeholder="Rechercher par nom, numéro de série, marque..."
            style={{
              border: 'none', outline: 'none', fontSize: '13px',
              color: '#333', flex: 1, background: 'transparent',
            }}
          />
        </div>

        {/* Filtres type */}
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

          {/* Filtre statut */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            style={{
              padding: '5px 10px', borderRadius: '6px', fontSize: '12px',
              border: '0.5px solid #e0e0e0', background: '#fff',
              color: '#666', cursor: 'pointer', outline: 'none',
            }}
          >
            {STATUS_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Tableau */}
        <div style={{
          background: '#fff', border: '0.5px solid #e0e0e0',
          borderRadius: '8px', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {['Nom', 'Type', 'Marque / Modèle', 'N° série', 'Département', 'Affecté à', 'Statut', 'Garantie'].map(h => (
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
              ) : equipment.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>
                  Aucun équipement trouvé
                </td></tr>
              ) : (
                equipment.map(eq => {
                  const warrantyExpired = eq.warranty_end_date
                    && new Date(eq.warranty_end_date) < new Date()

                  return (
                    <tr key={eq.id}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/equipment/${eq.id}`)}

                    >
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', fontWeight: '500' }}>
                        {eq.name}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', color: '#666' }}>
                        {TYPE_MAP[eq.type] ?? eq.type}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', color: '#666' }}>
                        {[eq.brand, eq.model].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', color: '#888', fontFamily: 'monospace', fontSize: '11px' }}>
                        {eq.serial_number || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', color: '#666' }}>
                        {eq.department_name || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', color: '#666' }}>
                        {eq.assigned_to_name || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5' }}>
                        <Badge value={eq.status} map={STATUS_MAP} />
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', whiteSpace: 'nowrap' }}>
                        {eq.warranty_end_date ? (
                          <span style={{
                            fontSize: '11px',
                            color: warrantyExpired ? '#791F1F' : '#27500A',
                          }}>
                            {warrantyExpired ? '⚠ ' : ''}
                            {new Date(eq.warranty_end_date).toLocaleDateString('fr-FR')}
                          </span>
                        ) : (
                          <span style={{ color: '#ccc', fontSize: '11px' }}>—</span>
                        )}
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
          {count} équipement{count > 1 ? 's' : ''} au total
        </div>

      </div>
    </AppLayout>
  )
}