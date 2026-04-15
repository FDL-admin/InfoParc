import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('Email ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F5F5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        border: '0.5px solid #e0e0e0',
        padding: '40px 36px',
        width: '100%',
        maxWidth: '360px',
        textAlign: 'center',
      }}>
        {/* Logo rond BUMIGEB */}
        <img
          src="/logo.png"
          alt="BUMIGEB"
          style={{ width: '80px', height: '80px', objectFit: 'contain', margin: '0 auto 14px', display: 'block' }}
        />

        <h1 style={{ fontSize: '18px', fontWeight: '500', color: '#1B5E20', marginBottom: '4px' }}>
          InfoParc
        </h1>
        <p style={{ fontSize: '12px', color: '#888', marginBottom: '28px' }}>
          BUMIGEB — Direction Régionale de Bobo
        </p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px' }}>
              Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="vous@bumigeb.bf"
              style={{
                width: '100%', padding: '9px 12px',
                border: '0.5px solid #ccc', borderRadius: '6px',
                fontSize: '13px', outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px' }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%', padding: '9px 12px',
                border: '0.5px solid #ccc', borderRadius: '6px',
                fontSize: '13px', outline: 'none',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#FCEBEB', color: '#791F1F',
              borderRadius: '6px', padding: '8px 12px',
              fontSize: '12px', marginBottom: '14px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '10px',
              background: loading ? '#81C784' : '#1B5E20',
              color: '#fff', border: 'none',
              borderRadius: '6px', fontSize: '13px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background .2s',
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p style={{ marginTop: '16px', fontSize: '11px', color: '#aaa' }}>
          Accès réservé au personnel BUMIGEB
        </p>
      </div>
    </div>
  )
}