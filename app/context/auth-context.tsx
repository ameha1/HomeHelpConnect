// context/auth-context.tsx
"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { jwtDecode } from 'jwt-decode'
import Email from 'next-auth/providers/email'

interface JwtPayload {
  sub: string;  // email is typically in the 'sub' claim
  user_id?: string;
  role?: string;
  // Add other claims you expect in your token
}

type AuthContextType = {
  user: {
    token: string;
    role: string;
    userId: string;
    email: string;
  } | null;
  loading: boolean;
  login: (token: string) => void;  // Simplified to just take token
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{
    token: string;
    role: string;
    userId: string;
    email: string;
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const decodeToken = (token: string) => {
    try {
      const decoded = jwtDecode<JwtPayload>(token)
    
      return {
        email: decoded.sub,
        role: decoded.role || '',
        userId: decoded.user_id || ''
      }
      
    } catch (error) {
      console.error('Failed to decode token:', error)
      return null
    }
  }
  
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    
    if (token) {
      const userData = decodeToken(token)
      if (userData) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        setUser({ 
          token, 
          role: userData.role, 
          userId: userData.userId, 
          email: userData.email 
        })
      }
    }
    setLoading(false)
  }, [])

  const login = (token: string) => {
    const userData = decodeToken(token)
    if (!userData) {
      throw new Error('Invalid token')
    }

    localStorage.setItem('authToken', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser({ 
      token, 
      role: userData.role, 
      userId: userData.userId, 
      email: userData.email 
    })
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}