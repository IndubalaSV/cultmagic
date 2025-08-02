import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userPreferences, setUserPreferences] = useState({})

  // Set up axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [token])

  // Check if user is authenticated on app load ONLY (not on every token change)
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token')
      if (storedToken) {
        try {
          // Set up axios headers for the check
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
          const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`)
          setUser(response.data)
          setToken(storedToken) // Set token state to match localStorage
        } catch (error) {
          // Handle auth check error silently
          // Clear invalid token
          setUser(null)
          setToken(null)
          localStorage.removeItem('token')
          delete axios.defaults.headers.common['Authorization']
        }
      }
      setLoading(false)
    }

    // Only run on initial app load
    checkAuth()
  }, []) // Empty dependency array - only runs once on mount

  const login = useCallback(async (username, password) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login`, {
        username,
        password
      })
      
      const { access_token } = response.data
      setToken(access_token)
      localStorage.setItem('token', access_token)
      
      // Set up axios headers immediately
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      // Get user info
      const userResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`)
      setUser(userResponse.data)
      
      return { success: true }
    } catch (error) {
      // Handle login error silently
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      }
    }
  }, [])

  const register = useCallback(async (username, email, password) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/register`, {
        username,
        email,
        password
      })
      
      const { access_token } = response.data
      setToken(access_token)
      localStorage.setItem('token', access_token)
      
      // Set up axios headers immediately
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      // Get user info
      const userResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`)
      setUser(userResponse.data)
      
      return { success: true }
    } catch (error) {
      // Handle registration error silently
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      }
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
  }, [])

  const getPreferences = useCallback(async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/preferences`)
      setUserPreferences(response.data)
      return { success: true, data: response.data }
    } catch (error) {
      // Handle preferences error silently
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to get preferences',
        data: {}
      }
    }
  }, [])

  const savePreferences = useCallback(async (preferences) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/preferences`, preferences)
      // Only update local state after successful backend save
      const updatedPrefs = await getPreferences()
      if (updatedPrefs.success) {
        setUserPreferences(updatedPrefs.data)
      }
      return { success: true }
    } catch (error) {
      // Handle save preferences error silently
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to save preferences' 
      }
    }
  }, [getPreferences])

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    savePreferences,
    getPreferences,
    userPreferences,
    isAuthenticated: !!token
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 