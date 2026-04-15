import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const getNav = (role) => {
  if (role === 'user') {
    return [
      {
        section: 'Mes demandes',
        items: [
          { to: '/tickets', label: 'Mes tickets', icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          )},
        ]
      }
    ]
  }

  const base = [
    {
      section: 'Principal',
      items: [
        { to: '/', label: 'Dashboard', icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
        )},
        { to: '/equipment', label: 'Équipements', icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
        )},
        { to: '/tickets', label: 'Tickets', icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        )},
        { to: '/contracts', label: 'Contrats', icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        )},
      ]
    }
  ]

  if (role === 'superadmin') {
    base.push({
      section: 'Administration',
      items: [
        { to: '/users', label: 'Utilisateurs', icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        )},
      ]
    })
  }

  return base
}

export default function Sidebar() {
  const { user, logout } = useAuth()

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '?'

  return (
    <div style={{
      width: '210px', minHeight: '100vh', background: '#1B5E20',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      {/* Logo */}
     <div style={{
        padding: '12px 14px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <img
          src="/logo.png"
          alt="BUMIGEB"
          style={{ width: '36px', height: '36px', objectFit: 'contain', flexShrink: 0 }}
        />
        <div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#fff' }}>InfoParc</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', marginTop: '1px' }}>
            BUMIGEB — Bobo-Dioulasso
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, paddingTop: '8px' }}>
        {getNav(user?.role).map(group => (
          <div key={group.section}>
            <div style={{
              padding: '10px 16px 4px',
              fontSize: '10px', color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase', letterSpacing: '.06em',
            }}>
              {group.section}
            </div>
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 16px', fontSize: '13px', textDecoration: 'none',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  borderLeft: isActive ? '3px solid #C2185B' : '3px solid transparent',
                  transition: 'all .15s',
                })}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Profil + déconnexion */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: '#C2185B', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '11px', fontWeight: '500', color: '#fff',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#fff' }}>
              {user?.first_name} {user?.last_name}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
              {user?.role}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            width: '100%', padding: '6px', fontSize: '12px',
            background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
            border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}