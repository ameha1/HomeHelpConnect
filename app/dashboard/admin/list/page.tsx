// app/(super-admin)/admins/page.tsx
"use client"

import { Admin, AdminsTable } from "./adminTable"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminListPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const response = await fetch('http://localhost:8000/admins', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          }
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch admins')
        }
        
        const data = await response.json()
        setAdmins(data)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch admins",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchAdmins()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Management</h1>
        <Button onClick={() => router.push('/dashboard/admin/create')}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Admin
        </Button>
      </div>
      
      <AdminsTable data={admins} />
    </div>
  )
}