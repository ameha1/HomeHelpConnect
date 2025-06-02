'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

type User = {
  email: string
  role: 'service_provider' | 'home_owner'
}

type AuthContextType = {
  user: User | null
  login: (email: string, password: string, role: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContextInstance = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
  isLoading: true,
})

type LoginResponse = {
  access_token: string
  role: 'service_provider' | 'home_owner'
  email: string
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('token')
      const role = localStorage.getItem('role') as User['role']

      if (token && role) {
        try {
          const response = await api.get('/verify-token', {
            headers: { Authorization: `Bearer ${token}` },
          })

          setUser({ email: response.data.email, role })
        } catch (error) {
          localStorage.removeItem('token')
          localStorage.removeItem('role')
          setUser(null)
        }
      }

      setIsLoading(false)
    }

    loadUser()
  }, [])

  const login = async (email: string, password: string, role: string) => {
    try {
      const response = await api.post<LoginResponse>(
        '/signin/',
        {
          email,
          password,
          role: role === 'provider' ? 'service_provider' : 'home_owner',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )

      localStorage.setItem('token', response.data.access_token)
      localStorage.setItem('role', response.data.role)
      setUser({ email: response.data.email, role: response.data.role })

      if (response.data.role === 'service_provider') {
        router.push('/provider/dashboard')
      } else {
        router.push('/homeowner/dashboard')
      }
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error?.response?.data?.detail || 'Something went wrong',
        variant: 'destructive',
      })
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    setUser(null)
    router.push('/login')
  }

  if (isLoading) {
    return <div className="p-4 text-center">Loading...</div>
  }

  return (
    <AuthContextInstance.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContextInstance.Provider>
  )
}

export const useAuth = () => useContext(AuthContextInstance)
