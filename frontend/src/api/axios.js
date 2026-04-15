import axios from 'axios'

const api = axios.create({
  baseURL: '/api',  // proxy Vite redirige vers Django :8000
})

// Injecte automatiquement le token JWT dans chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Gère l'expiration du token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // Token expiré → on tente un refresh automatique
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')

      if (refresh) {
        try {
          const res = await axios.post('/api/auth/token/refresh/', {
            refresh,
          })
          localStorage.setItem('access_token', res.data.access)
          original.headers.Authorization = `Bearer ${res.data.access}`
          return api(original)
        } catch {
          // Refresh échoué → déconnexion
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api