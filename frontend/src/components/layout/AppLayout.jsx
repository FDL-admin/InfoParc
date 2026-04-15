import Sidebar from './Sidebar'

export default function AppLayout({ topbar, children }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minWidth: 0, overflow: 'hidden',
      }}>
        {/* TopBar fixe — reçue en prop depuis chaque page */}
        {topbar && (
          <div style={{ flexShrink: 0 }}>
            {topbar}
          </div>
        )}
        {/* Contenu scrollable uniquement */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#F5F5F5' }}>
          {children}
        </div>
      </div>
    </div>
  )
}