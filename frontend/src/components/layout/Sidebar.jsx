import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV_ICONS = {
  dashboard: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  equipment: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    </svg>
  ),
  ticket: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  contract: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  users: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  profile: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
  logout: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
}

const getNav = (role) => {
  if (role === 'user') {
    return [
      {
        section: 'Mes demandes',
        items: [{ to: '/tickets', label: 'Mes tickets', icon: NAV_ICONS.ticket }],
      },
    ]
  }

  const base = [
    {
      section: 'Principal',
      items: [
        { to: '/',          label: 'Dashboard',   icon: NAV_ICONS.dashboard  },
        { to: '/equipment', label: 'Équipements', icon: NAV_ICONS.equipment  },
        { to: '/tickets',   label: 'Tickets',     icon: NAV_ICONS.ticket     },
        { to: '/contracts', label: 'Contrats',    icon: NAV_ICONS.contract   },
      ],
    },
  ]

  if (role === 'superadmin') {
    base.push({
      section: 'Administration',
      items: [{ to: '/users', label: 'Utilisateurs', icon: NAV_ICONS.users }],
    })
  }

  return base
}

function navClass({ isActive }) {
  return isActive ? 'nav-item active' : 'nav-item'
}

export default function Sidebar() {
  const { user, logout } = useAuth()

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '?'

  return (
    <div style={{
      width: '224px',
      minHeight: '100vh',
      background: '#1B5E20',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      fontFamily: "'Inter', system-ui, sans-serif",
      borderRight: '1px solid rgba(255,255,255,0.07)',
    }}>
      {/* ── Logo ── */}
      <div style={{
        padding: '18px 16px 15px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '11px',
      }}>
        <img
          src="/logo.png"
          alt="BUMIGEB"
          style={{ width: '34px', height: '34px', objectFit: 'contain', flexShrink: 0 }}
        />
        <div>
          <div style={{ fontSize: '17px', fontWeight: '600', color: '#fff', letterSpacing: '0.015em', lineHeight: 1.2 }}>
            InfoParc
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.42)', marginTop: '2px', fontStyle: 'italic' }}>
            BUMIGEB · Bobo-Dioulasso
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: '12px 8px 4px' }}>
        {getNav(user?.role).map(group => (
          <div key={group.section} style={{ marginBottom: '20px' }}>
            {/* Séparateur de section */}
            <div style={{
              padding: '2px 12px 6px',
              fontSize: '10px',
              color: 'rgba(255,255,255,0.28)',
              textTransform: 'uppercase',
              letterSpacing: '.14em',
              fontWeight: '500',
            }}>
              {group.section}
            </div>

            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={navClass}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* ── Pied de page ── */}
      <div style={{
        padding: '10px 8px 16px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        <NavLink to="/profile" className={navClass}>
          {NAV_ICONS.profile}
          Mon profil
        </NavLink>

        {/* Carte utilisateur */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 12px',
          margin: '4px 0',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.14)',
            border: '1px solid rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '600',
            color: '#fff',
            flexShrink: 0,
            letterSpacing: '0.03em',
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: '13.5px',
              color: '#fff',
              fontWeight: '500',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.3,
            }}>
              {user?.first_name} {user?.last_name}
            </div>
            <div style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.38)',
              textTransform: 'capitalize',
              fontStyle: 'italic',
            }}>
              {user?.role}
            </div>
          </div>
        </div>

        <button onClick={logout} className="logout-btn">
          {NAV_ICONS.logout}
          Se déconnecter
        </button>
      </div>
    </div>
  )
}


