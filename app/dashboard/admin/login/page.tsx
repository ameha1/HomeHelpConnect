// app/(auth)/admin-login/page.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, SubmitHandler } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { HomeIcon, Loader2, Shield, ShieldCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"
import { useRouter } from "next/navigation"

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid admin email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  is_super_admin: z.boolean().default(false).refine((val) => val !== undefined, {
    message: "is_super_admin must be a boolean value.",
  })
})

export default function AdminLoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      is_super_admin: false
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          is_super_admin: values.is_super_admin
        }),
      });
  
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || "Admin login failed");
      }
  
      localStorage.setItem('admin_token', data.access_token);
      localStorage.setItem('adminData', JSON.stringify(data.admin));
      
      // Redirect based on admin type
      router.push(data.admin.is_super_admin 
        ? '/dashboard/superadmin' 
        : '/dashboard/admin');
      
      toast({
        title: "Login successful!",
        description: `Welcome ${data.admin.full_name || 'Admin'}`,
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex h-screen w-screen items-center justify-center bg-gradient-to-br from-homehelp-50 via-white to-homehelp-100 overflow-hidden">
      {/* Decorative Blur Circles */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-homehelp-200 rounded-full filter blur-3xl opacity-40 animate-pulse" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-homehelp-300 rounded-full filter blur-3xl opacity-30 animate-pulse" />
  
      {/* Logo Link */}
      <Link
        href="/"
        className="absolute left-6 top-6 md:left-10 md:top-10 flex items-center gap-2 hover:opacity-90 transition"
      >
        <HomeIcon className="h-6 w-6 text-homehelp-600" />
        <span className="text-xl font-semibold text-homehelp-700">HomeHelp</span>
      </Link>
  
      {/* Login Card */}
      <Card className="z-10 w-full max-w-md bg-white/80 backdrop-blur-xl border border-gray-200 shadow-xl rounded-2xl">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center">
            <Shield className="h-9 w-9 text-homehelp-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-800">Admin Login</CardTitle>
          <CardDescription className="text-sm text-gray-600">
            Access restricted to authorized personnel only.
          </CardDescription>
        </CardHeader>
  
        <CardContent className="px-6 pb-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Admin Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="admin@homehelp.com"
                        {...field}
                        className="focus:ring-2 focus:ring-homehelp-600 focus:outline-none transition"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
  
              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        className="focus:ring-2 focus:ring-homehelp-600 focus:outline-none transition"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
  
              {/* Super Admin Checkbox */}
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
                        <label htmlFor="is_super_admin" className="ml-2 text-sm text-gray-700 flex items-center">
                          <ShieldCheck className="w-4 h-4 mr-1" />
                          Login as Super Admin
                        </label>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
  
              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-homehelp-600 hover:bg-homehelp-700 text-white transition-colors"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Access Admin Dashboard"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
  
}