import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  // --- Connexion ---
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // --- Mode : 'login' | 'forgot' ---
  const [mode, setMode] = useState('login')
  const [forgotStep, setForgotStep] = useState(1)

  // Étape 1
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotInfo, setForgotInfo] = useState('')

  // Étape 2
  const [resetToken, setResetToken] = useState('')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState('')

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

  const handleForgotRequest = async () => {
    if (!forgotEmail.trim()) {
      setForgotError('Veuillez saisir votre adresse email.')
      return
    }
    setForgotLoading(true)
    setForgotError('')
    try {
      const res = await api.post('/auth/password-reset/', { email: forgotEmail })
      setForgotInfo(res.data.detail)
      setForgotStep(2)
    } catch (e) {
      const data = e.response?.data
      setForgotError(data?.detail ?? 'Erreur lors de l\'envoi. Réessayez.')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleResetConfirm = async () => {
    if (!resetToken.trim() || !resetNewPassword.trim() || !resetConfirm.trim()) {
      setResetError('Tous les champs sont obligatoires.')
      return
    }
    if (resetNewPassword !== resetConfirm) {
      setResetError('Les mots de passe ne correspondent pas.')
      return
    }
    if (resetNewPassword.length < 8) {
      setResetError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    setResetLoading(true)
    setResetError('')
    try {
      const res = await api.post('/auth/password-reset/confirm/', {
        token: resetToken,
        new_password: resetNewPassword,
        confirm_password: resetConfirm,
      })
      setResetSuccess(res.data.detail)
    } catch (e) {
      const data = e.response?.data
      setResetError(data?.detail ?? 'Code invalide ou expiré.')
      setResetLoading(false)
    }
  }

  const resetForgotFlow = () => {
    setMode('login')
    setForgotStep(1)
    setForgotEmail('')
    setForgotError('')
    setForgotInfo('')
    setResetToken('')
    setResetNewPassword('')
    setResetConfirm('')
    setResetError('')
    setResetSuccess('')
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px',
    border: '0.5px solid #ccc', borderRadius: '6px',
    fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = {
    fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#F5F5F5',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px',
        border: '0.5px solid #e0e0e0', padding: '40px 36px',
        width: '100%', maxWidth: '360px', textAlign: 'center',
      }}>
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

        {/* ===== MODE CONNEXION ===== */}
        {mode === 'login' && (
          <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Adresse email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="vous@bumigeb.bf"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={inputStyle}
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
              }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <button
                type="button"
                onClick={() => setMode('forgot')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#185FA5', fontSize: '12px', textDecoration: 'underline',
                }}
              >
                Mot de passe oublié ?
              </button>
            </div>
          </form>
        )}

        {/* ===== MODE MOT DE PASSE OUBLIÉ ===== */}
        {mode === 'forgot' && (
          <div style={{ textAlign: 'left' }}>

            {/* Étape 1 — Demande de code */}
            {forgotStep === 1 && (
              <>
                <div style={{
                  fontSize: '14px', fontWeight: '500', color: '#1B5E20',
                  marginBottom: '6px',
                }}>
                  Réinitialiser le mot de passe
                </div>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '18px' }}>
                  Saisissez votre email pour recevoir un code de réinitialisation.
                </p>

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Adresse email</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="vous@bumigeb.bf"
                    style={inputStyle}
                  />
                </div>

                {forgotError && (
                  <div style={{
                    background: '#FCEBEB', color: '#791F1F',
                    borderRadius: '6px', padding: '8px 12px',
                    fontSize: '12px', marginBottom: '12px',
                  }}>
                    {forgotError}
                  </div>
                )}

                <button
                  onClick={handleForgotRequest}
                  disabled={forgotLoading}
                  style={{
                    width: '100%', padding: '10px',
                    background: forgotLoading ? '#81C784' : '#1B5E20',
                    color: '#fff', border: 'none',
                    borderRadius: '6px', fontSize: '13px',
                    cursor: forgotLoading ? 'not-allowed' : 'pointer',
                    marginBottom: '12px',
                  }}
                >
                  {forgotLoading ? 'Envoi...' : 'Envoyer le code'}
                </button>
              </>
            )}

            {/* Étape 2 — Confirmation avec le code */}
            {forgotStep === 2 && (
              <>
                <div style={{
                  fontSize: '14px', fontWeight: '500', color: '#1B5E20',
                  marginBottom: '6px',
                }}>
                  Nouveau mot de passe
                </div>

                {forgotInfo && (
                  <div style={{
                    background: '#EAF3DE', color: '#27500A',
                    borderRadius: '6px', padding: '8px 12px',
                    fontSize: '12px', marginBottom: '14px',
                  }}>
                    {forgotInfo}
                  </div>
                )}

                {resetSuccess ? (
                  <div style={{
                    background: '#EAF3DE', color: '#27500A',
                    borderRadius: '6px', padding: '10px 12px',
                    fontSize: '12px', marginBottom: '14px',
                  }}>
                    {resetSuccess}
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={labelStyle}>Code reçu par email</label>
                      <input
                        type="text"
                        value={resetToken}
                        onChange={e => setResetToken(e.target.value)}
                        placeholder="Code à 32 caractères"
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label style={labelStyle}>Nouveau mot de passe</label>
                      <input
                        type="password"
                        value={resetNewPassword}
                        onChange={e => setResetNewPassword(e.target.value)}
                        placeholder="Minimum 8 caractères"
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>Confirmer le mot de passe</label>
                      <input
                        type="password"
                        value={resetConfirm}
                        onChange={e => setResetConfirm(e.target.value)}
                        placeholder="Confirmer"
                        style={inputStyle}
                      />
                    </div>

                    {resetError && (
                      <div style={{
                        background: '#FCEBEB', color: '#791F1F',
                        borderRadius: '6px', padding: '8px 12px',
                        fontSize: '12px', marginBottom: '12px',
                      }}>
                        {resetError}
                      </div>
                    )}

                    <button
                      onClick={handleResetConfirm}
                      disabled={resetLoading}
                      style={{
                        width: '100%', padding: '10px',
                        background: resetLoading ? '#81C784' : '#1B5E20',
                        color: '#fff', border: 'none',
                        borderRadius: '6px', fontSize: '13px',
                        cursor: resetLoading ? 'not-allowed' : 'pointer',
                        marginBottom: '12px',
                      }}
                    >
                      {resetLoading ? 'Réinitialisation...' : 'Réinitialiser'}
                    </button>
                  </>
                )}
              </>
            )}

            {/* Retour connexion */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={resetForgotFlow}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#185FA5', fontSize: '12px', textDecoration: 'underline',
                }}
              >
                ← Retour à la connexion
              </button>
            </div>
          </div>
        )}

        <p style={{ marginTop: '16px', fontSize: '11px', color: '#aaa' }}>
          Accès réservé au personnel BUMIGEB
        </p>
      </div>
    </div>
  )
}
