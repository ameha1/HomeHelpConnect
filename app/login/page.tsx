"use client"

import { useState } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { HomeIcon, Loader2, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import axios from "axios"
import { useAuth } from '../context/auth-context'
import api from "@/lib/api"
import { access } from "fs"

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
  role: z.enum(["homeowner", "provider"]),
})

type FormValues = z.infer<typeof formSchema>

export default function LoginPage() {
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [backendError, setBackendError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      role: "homeowner",
    },
  })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    setBackendError(null) // Clear previous errors

    try {
      const formData = new URLSearchParams()
      formData.append("email", values.email)
      formData.append("password", values.password)
      formData.append("role", values.role === "provider" ? "serviceproviders" : "homeowners")
      
      const response = await axios.post('http://localhost:8000/signin/', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      // Use the auth context login function
      login(response.data.access_token)
      
      // Show success toast with a more prominent message
      toast({
        title: "🎉 Login Successful!",
        description: "Welcome back! You will be redirected to your dashboard shortly...",
        variant: "default",
        duration: 5000,
        className: "bg-green-50 border-green-200",
        style: {
          backgroundColor: '#f0fdf4',
          borderColor: '#86efac',
          color: '#166534',
        }
      })

      // Add a longer delay before redirecting to ensure the toast is visible
      setTimeout(() => {
        // Redirect based on role and pending status
        if (response.data.is_pending && response.data.needs_documents) {
          router.push('/dashboard/provider/pending_user')
        } else if (response.data.is_pending && !response.data.needs_documents) {
          router.push('/dashboard/provider/pending_userWithDocuments')
        } else {
          router.push(response.data.redirect_to || 
            (response.data.role === 'serviceproviders' 
              ? '/dashboard/provider' 
              : '/dashboard/homeowner'))
        }
      }, 2000) // Increased delay to 2 seconds

    } catch (error: any) {
      let errorMessage = "An unexpected error occurred. Please try again."
      
      if (error.response) {
        // Handle specific error messages from backend
        if (error.response.data.detail) {
          errorMessage = error.response.data.detail
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message
        } else if (error.response.status === 401) {
          errorMessage = "Invalid email or password."
        }
      } else if (error.request) {
        errorMessage = "No response from server. Please check your connection."
      }
      
      setBackendError(errorMessage)
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-homehelp-50 to-white flex items-center justify-center p-4">
      <div className="absolute top-6 left-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-homehelp-600 p-2 rounded-lg group-hover:bg-homehelp-700 transition-colors">
            <HomeIcon className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-homehelp-600 to-homehelp-400 bg-clip-text text-transparent">
            HomeHelp
          </span>
        </Link>
      </div>

      <Card className="w-full max-w-md border-none shadow-lg rounded-2xl overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-homehelp-400 to-homehelp-600 opacity-10" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-3xl font-bold text-center text-homehelp-800">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center text-homehelp-600">
              Sign in to access your account
            </CardDescription>
          </CardHeader>
        </div>

        <CardContent className="p-6">
          {/* Backend error message display */}
          {backendError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {backendError}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-homehelp-700">Email Address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="email"
                          placeholder="john.doe@example.com"
                          className="pl-10 py-5 rounded-lg border-gray-300 focus:border-homehelp-500 focus:ring-2 focus:ring-homehelp-200"
                          {...field}
                          disabled={isLoading}
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg
                            className="h-5 w-5 text-homehelp-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-500 text-sm" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-homehelp-700">Password</FormLabel>
                      <Link
                        href="/forgot-password"
                        className="text-sm text-homehelp-500 hover:text-homehelp-700 transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          className="pl-10 py-5 rounded-lg border-gray-300 focus:border-homehelp-500 focus:ring-2 focus:ring-homehelp-200"
                          {...field}
                          disabled={isLoading}
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg
                            className="h-5 w-5 text-homehelp-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                        </div>
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5 text-homehelp-500" />
                          ) : (
                            <Eye className="h-5 w-5 text-homehelp-500" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-500 text-sm" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-homehelp-700">I am a</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          className={`py-3 px-4 rounded-lg border-2 transition-all ${field.value === 'homeowner' ? 'border-homehelp-600 bg-homehelp-50 text-homehelp-700' : 'border-gray-200 hover:border-homehelp-300'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => !isLoading && field.onChange('homeowner')}
                          disabled={isLoading}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                              />
                            </svg>
                            Homeowner
                          </div>
                        </button>
                        <button
                          type="button"
                          className={`py-3 px-4 rounded-lg border-2 transition-all ${field.value === 'provider' ? 'border-homehelp-600 bg-homehelp-50 text-homehelp-700' : 'border-gray-200 hover:border-homehelp-300'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => !isLoading && field.onChange('provider')}
                          disabled={isLoading}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                              />
                            </svg>
                            Service Provider
                          </div>
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-500 text-sm" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full py-6 rounded-lg bg-gradient-to-r from-homehelp-600 to-homehelp-400 hover:from-homehelp-700 hover:to-homehelp-500 text-white font-medium shadow-md hover:shadow-lg transition-all relative"
                disabled={isLoading}
              >
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}
                <span className={isLoading ? "invisible" : ""}>Sign In</span>
              </Button>
            </form>
          </Form>

          {/* <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="py-5 rounded-lg border-gray-300 hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            </div>
          </div> */}
        </CardContent>

        <div className="px-6 pb-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-homehelp-600 hover:text-homehelp-700 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}