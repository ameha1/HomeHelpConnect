// app/(super-admin)/dashboard/page.tsx
"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldPlus, Users, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useEffect } from "react"

export default function SuperAdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Verify admin is super admin
    const adminData = localStorage.getItem('adminData')
    if (!adminData || !JSON.parse(adminData).is_super_admin) {
      router.push('/dashboard/admin/login')
      toast({
        title: "Access Denied",
        description: "Super admin privileges required",
        variant: "destructive"
      })
    }
  }, [router, toast])

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <ShieldPlus className="h-8 w-8 text-homehelp-600" />
        Super Admin Dashboard
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldPlus className="h-6 w-6 text-homehelp-600" />
              Create New Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Register new admin users with specific privileges
            </p>
            <Button 
              onClick={() => router.push('/dashboard/admin/create')}
              className="w-full"
            >
              Create Admin <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6 text-homehelp-600" />
              Manage Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              View and manage all admin accounts in the system
            </p>
            <Button 
              onClick={() => router.push('/dashboard/admin/list')}
              className="w-full"
              variant="outline"
            >
              View Admins <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}