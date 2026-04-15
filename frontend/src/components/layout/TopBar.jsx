export default function TopBar({ title, actions }) {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div style={{
      background: '#fff', padding: '10px 20px',
      borderBottom: '0.5px solid #e0e0e0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <h1 style={{ fontSize: '15px', fontWeight: '500', color: '#1B5E20' }}>
        {title}
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '12px', color: '#999' }}>{today}</span>
        {actions}
      </div>
    </div>
  )
}