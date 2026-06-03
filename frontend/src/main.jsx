import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DialogProvider } from './context/DialogContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import TicketList from './pages/tickets/TicketList'
import EquipmentList from './pages/equipment/EquipmentList'
import './index.css'
import ContractList from './pages/contracts/ContractList'
import UserList from './pages/users/UserList'
import TicketDetail from './pages/tickets/TicketDetail'
import EquipmentDetail from './pages/equipment/EquipmentDetail'
import TicketCreate from './pages/tickets/TicketCreate'
import ContractCreate from './pages/contracts/ContractCreate'
import ContractDetail from './pages/contracts/ContractDetail'
import EquipmentCreate from './pages/equipment/EquipmentCreate'
import EquipmentEdit from './pages/equipment/EquipmentEdit'
import UserDetail from './pages/users/UserDetail'
import Profile from './pages/profile/Profile'

function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ fontSize: '72px', fontWeight: '700', color: '#e5e7eb', lineHeight: 1 }}>404</div>
      <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginTop: '12px' }}>Page introuvable</div>
      <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '6px' }}>Cette page n'existe pas ou a été déplacée.</div>
      <button onClick={() => navigate('/')} style={{ marginTop: '24px', padding: '10px 24px', background: '#1B5E20', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
        Retour au tableau de bord
      </button>
    </div>
  )
}

// Protection des routes — redirige vers /login si non connecté
function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{padding:'2rem',color:'#1B5E20'}}>Chargement...</div>
  return user ? children : <Navigate to="/login" replace />
}

// Ajoute après PrivateRoute
function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: '2rem', color: '#1B5E20' }}>Chargement...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'user') return <Navigate to="/tickets" replace />
  return children
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DialogProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AdminRoute><Dashboard /></AdminRoute>} />
          <Route path="*" element={<NotFound />} />
          <Route path="/equipment/new" element={<AdminRoute><EquipmentCreate /></AdminRoute>} />
          <Route path="/equipment" element={<AdminRoute><EquipmentList /></AdminRoute>} />
          <Route path="/equipment/:id" element={<AdminRoute><EquipmentDetail /></AdminRoute>} />
          <Route path="/contracts/new" element={<AdminRoute><ContractCreate /></AdminRoute>} />
          <Route path="/contracts/:id" element={<AdminRoute><ContractDetail /></AdminRoute>} />
          <Route path="/contracts" element={<AdminRoute><ContractList /></AdminRoute>} />
          <Route path="/users" element={<AdminRoute><UserList /></AdminRoute>} />
          <Route path="/users/:id" element={<AdminRoute><UserDetail /></AdminRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

          <Route path="/tickets" element={<PrivateRoute><TicketList /></PrivateRoute>} />
          <Route path="/tickets/new" element={<PrivateRoute><TicketCreate /></PrivateRoute>} />
          <Route path="/tickets/:id" element={<PrivateRoute><TicketDetail /></PrivateRoute>} />
        </Routes>
        </DialogProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)