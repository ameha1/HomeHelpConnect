// app/(super-admin)/admins/create/page.tsx
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldPlus } from "lucide-react"

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  is_super_admin: z.boolean()
})

export default function CreateAdminPage() {
  const { toast } = useToast()
  const router = useRouter()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      is_super_admin: false
    }
  })

 // Add this utility function
const checkTokenExpiration = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

// Modify your onSubmit function
async function onSubmit(values: z.infer<typeof formSchema>) {
  const token = localStorage.getItem('admin_token');
  
  if (!token || !checkTokenExpiration(token)) {
    router.push('/admin/login');
    toast({
      title: "Session Expired",
      description: "Please login again",
      variant: "destructive"
    });
    return;
  }

  try {
    const response = await axios.post('http://localhost:8000/register/admin', values, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    toast({ title: "Success", description: "Admin created successfully" });
    router.push('/dashboard/admin/list');
  } catch (error: any) {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      router.push('/admin/login');
    }
    toast({
      title: "Error",
      description: error.response?.data?.detail || "Operation failed",
      variant: "destructive"
    });
  }
}

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldPlus className="w-6 h-6" />
            Create New Admin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Admin Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="is_super_admin"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="is_super_admin"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-gray-300 text-homehelp-600 focus:ring-homehelp-600"
                        />
                        <label htmlFor="is_super_admin" className="ml-2 text-sm font-medium text-gray-700">
                          Grant Super Admin Privileges
                        </label>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full">
                Create Admin
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
