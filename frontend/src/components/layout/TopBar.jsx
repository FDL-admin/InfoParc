export default function TopBar({ title, actions }) {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div style={{
      background: '#fff',
      padding: '11px 24px',
      borderBottom: '1px solid #e8ece8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <h1 style={{
        fontSize: '19px',
        fontWeight: '600',
        color: '#1B5E20',
        letterSpacing: '0.01em',
        margin: 0,
        lineHeight: 1,
      }}>
        {title}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{
          fontSize: '13px',
          color: '#9cad9c',
          fontStyle: 'italic',
          letterSpacing: '0.01em',
        }}>
          {today}
        </span>
        {actions}
      </div>
    </div>
  )
}


