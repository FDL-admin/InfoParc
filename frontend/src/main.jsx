import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
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
import EquipmentCreate from './pages/equipment/EquipmentCreate'
import EquipmentEdit from './pages/equipment/EquipmentEdit'



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
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AdminRoute><Dashboard /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/equipment/new" element={<AdminRoute><EquipmentCreate /></AdminRoute>} />
          <Route path="/equipment/:id/edit" element={<AdminRoute><EquipmentEdit /></AdminRoute>} />
          <Route path="/equipment" element={<AdminRoute><EquipmentList /></AdminRoute>} />
          <Route path="/equipment/:id" element={<AdminRoute><EquipmentDetail /></AdminRoute>} />
          <Route path="/contracts/new" element={<AdminRoute><ContractCreate /></AdminRoute>} />
          <Route path="/contracts" element={<AdminRoute><ContractList /></AdminRoute>} />
          <Route path="/users" element={<AdminRoute><UserList /></AdminRoute>} />

          <Route path="/tickets" element={<PrivateRoute><TicketList /></PrivateRoute>} />
          <Route path="/tickets/new" element={<PrivateRoute><TicketCreate /></PrivateRoute>} />
          <Route path="/tickets/:id" element={<PrivateRoute><TicketDetail /></PrivateRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)