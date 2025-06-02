// components/protected-route.tsx
"use client"

import { useAuth } from '../app/context/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react' // Assuming Loader2 is from lucide-react

export default function ProtectedRoute({ 
  children,
  requiredRole,
  pendingAllowed = false
}: { 
  children: React.ReactNode
  requiredRole?: string
  pendingAllowed?: boolean
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
    
    if (!loading && user && requiredRole && user.role !== requiredRole) {
      router.push('/login')
    }

    // Check if pending users are allowed (for pending dashboard)
    if (!loading && user && !pendingAllowed && user.role === 'serviceproviders' && !user.isVerified) {
      router.push('/dashboard/pending')
    }
  }, [user, loading, router, requiredRole, pendingAllowed])

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}