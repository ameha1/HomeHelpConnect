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
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import axios from "axios"
import { Loader2, User, Mail, Phone, Home, Lock, FileText, Award, Briefcase, ShieldCheck, CheckCircle } from "lucide-react"

const formSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  phone: z.string().min(10, { message: "Phone must be at least 10 digits" }).optional(),
  address: z.string().min(5, { message: "Address must be at least 5 characters" }).optional(),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string(),
  yearsExperience: z.number().int().positive().optional(),
  idVerification: z.any().optional(),
  certification: z.any().optional()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

export default function ProviderRegistrationPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [backendErrors, setBackendErrors] = useState<Record<string, string[]>>({})
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false) // State for modal visibility
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      address: "",
      password: "",
      confirmPassword: "",
      yearsExperience: undefined,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setBackendErrors({}) // Clear previous errors
    
    try {
      const formData = new FormData()
      formData.append("full_name", values.fullName)
      formData.append("email", values.email)
      formData.append("password", values.password)
      
      if (values.phone) formData.append("phone_number", values.phone)
      if (values.address) formData.append("address", values.address)
      if (values.yearsExperience) {
        formData.append("years_experience", values.yearsExperience.toString())
      }
      if (values.idVerification && values.idVerification instanceof File) {
        formData.append("id_verification", values.idVerification)
      }
      if (values.certification && values.certification instanceof File) {
        formData.append("certification", values.certification)
      }
  
      const response = await axios.post(
        'http://localhost:8000/register/provider/request',
        formData,
        { 
          headers: { 
            'Content-Type': 'multipart/form-data' 
          }
        }
      )

      // Handle successful response
      if (response.status === 200) {
        toast({
          title: "Registration submitted!",
          description: response.data.message,
        })
        setIsSuccessModalOpen(true) // Show the success modal
      }
      
    } catch (error: any) {
      if (error.response) {
        // Handle 400 Bad Request (validation errors)
        if (error.response.status === 400) {
          if (error.response.data.errors) {
            // Field-specific errors
            setBackendErrors(error.response.data.errors)
          } else if (error.response.data.detail) {
            // General error message
            setBackendErrors({
              non_field_errors: [error.response.data.detail]
            })
          }
        } 
        // Handle 500 Internal Server Error
        else if (error.response.status === 500) {
          toast({
            title: "Server Error",
            description: error.response.data.detail || "An error occurred on the server",
            variant: "destructive",
          })
        }
        // Handle other error statuses
        else {
          toast({
            title: "Registration Failed",
            description: error.response.data.detail || "An error occurred during registration",
            variant: "destructive",
          })
        }
      } else {
        // Network errors or other issues
        toast({
          title: "Network Error",
          description: "Could not connect to the server. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Function to get backend errors for a specific field
  const getBackendErrors = (fieldName: string) => {
    const backendFieldName = {
      fullName: 'full_name',
      email: 'email',
      phone: 'phone_number',
      address: 'address',
      password: 'password',
      yearsExperience: 'years_experience',
      idVerification: 'id_verification',
      certification: 'certification'
    }[fieldName] || fieldName
    
    return backendErrors[backendFieldName] || []
  }

  // Function to close the modal and redirect to login
  const handleModalClose = () => {
    setIsSuccessModalOpen(false)
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Success Modal */}
        {isSuccessModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 mx-4">
              <div className="flex flex-col items-center text-center">
                <CheckCircle className="h-12 w-12 text-homehelp-600 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Registration Successful!
                </h2>
                <p className="text-gray-600 mb-6">
                  Your service provider registration has been submitted successfully. Please sign in to continue.
                </p>
                <Button
                  onClick={handleModalClose}
                  className="w-full bg-gradient-to-r from-homehelp-600 to-homehelp-700 hover:from-homehelp-700 hover:to-homehelp-800 text-white h-12 px-8 text-lg font-medium shadow-md hover:shadow-lg transition-all"
                >
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="bg-homehelp-100/50 border border-homehelp-200 rounded-full p-3">
              <Briefcase className="h-8 w-8 text-homehelp-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Join Our Trusted Service Provider Network
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Grow your business by connecting with homeowners in your area
          </p>
        </div>

        {/* Registration Card */}
        <Card className="shadow-xl rounded-2xl overflow-hidden border-0">
          <CardHeader className="bg-gradient-to-r from-homehelp-600 to-homehelp-700 text-white py-8">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <User className="h-8 w-8" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold">
                  Service Provider Registration
                </CardTitle>
                <CardDescription className="text-white/90 text-lg">
                  Complete your profile to start receiving service requests
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-8">
            {/* Display general backend errors */}
            {backendErrors.non_field_errors && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
                <h3 className="font-medium flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Registration Error
                </h3>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {backendErrors.non_field_errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Personal Information Section */}
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                      <User className="h-6 w-6 text-homehelp-600" />
                      Personal Information
                    </h3>
                    <p className="text-gray-500 mt-1">
                      Tell us about yourself
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-gray-700">
                            <User className="h-5 w-5 text-homehelp-500" />
                            Full Name
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="John Doe" 
                              {...field} 
                              className="bg-white border-gray-300 focus:border-homehelp-500 focus:ring-homehelp-500 h-12"
                            />
                          </FormControl>
                          <FormMessage />
                          {getBackendErrors('fullName').map((error, index) => (
                            <p key={index} className="text-sm font-medium text-destructive mt-1">
                              {error}
                            </p>
                          ))}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-gray-700">
                            <Mail className="h-5 w-5 text-homehelp-500" />
                            Email Address
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="john.doe@example.com" 
                              {...field} 
                              className="bg-white border-gray-300 focus:border-homehelp-500 focus:ring-homehelp-500 h-12"
                            />
                          </FormControl>
                          <FormMessage />
                          {getBackendErrors('email').map((error, index) => (
                            <p key={index} className="text-sm font-medium text-destructive mt-1">
                              {error}
                            </p>
                          ))}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-gray-700">
                            <Phone className="h-5 w-5 text-homehelp-500" />
                            Phone Number
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="+1 (555) 123-4567" 
                              {...field} 
                              className="bg-white border-gray-300 focus:border-homehelp-500 focus:ring-homehelp-500 h-12"
                            />
                          </FormControl>
                          <FormMessage />
                          {getBackendErrors('phone').map((error, index) => (
                            <p key={index} className="text-sm font-medium text-destructive mt-1">
                              {error}
                            </p>
                          ))}
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Business Information Section */}
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                      <Briefcase className="h-6 w-6 text-homehelp-600" />
                      Business Information
                    </h3>
                    <p className="text-gray-500 mt-1">
                      Details about your service business
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-gray-700">
                            <Home className="h-5 w-5 text-homehelp-500" />
                            Business Address
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="123 Main St, City, State, ZIP" 
                              {...field} 
                              className="bg-white border-gray-300 focus:border-homehelp-500 focus:ring-homehelp-500 h-12"
                            />
                          </FormControl>
                          <FormMessage />
                          {getBackendErrors('address').map((error, index) => (
                            <p key={index} className="text-sm font-medium text-destructive mt-1">
                              {error}
                            </p>
                          ))}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="yearsExperience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-gray-700">
                            <Award className="h-5 w-5 text-homehelp-500" />
                            Years of Experience
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.valueAsNumber)}
                              className="bg-white border-gray-300 focus:border-homehelp-500 focus:ring-homehelp-500 h-12"
                            />
                          </FormControl>
                          <FormMessage />
                          {getBackendErrors('yearsExperience').map((error, index) => (
                            <p key={index} className="text-sm font-medium text-destructive mt-1">
                              {error}
                            </p>
                          ))}
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Account Security Section */}
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                      <Lock className="h-6 w-6 text-homehelp-600" />
                      Account Security
                    </h3>
                    <p className="text-gray-500 mt-1">
                      Create a secure password for your account
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-gray-700">
                            <Lock className="h-5 w-5 text-homehelp-500" />
                            Password
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              {...field} 
                              className="bg-white border-gray-300 focus:border-homehelp-500 focus:ring-homehelp-500 h-12"
                            />
                          </FormControl>
                          <FormMessage />
                          {getBackendErrors('password').map((error, index) => (
                            <p key={index} className="text-sm font-medium text-destructive mt-1">
                              {error}
                            </p>
                          ))}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-gray-700">
                            <Lock className="h-5 w-5 text-homehelp-500" />
                            Confirm Password
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              {...field} 
                              className="bg-white border-gray-300 focus:border-homehelp-500 focus:ring-homehelp-500 h-12"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Verification Documents Section */}
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                      <ShieldCheck className="h-6 w-6 text-homehelp-600" />
                      Verification Documents
                    </h3>
                    <p className="text-gray-500 mt-1">
                      You can submit these now or later in your provider dashboard
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="idVerification"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-gray-700">
                            <FileText className="h-5 w-5 text-homehelp-500" />
                            ID Verification
                          </FormLabel>
                          <FormControl>
                            <div className="flex flex-col gap-2">
                              <Input 
                                type="file" 
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => field.onChange(e.target.files?.[0])}
                                className="bg-white border-gray-300 focus:border-homehelp-500 focus:ring-homehelp-500 h-12 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-homehelp-50 file:text-homehelp-700 hover:file:bg-homehelp-100"
                              />
                              <p className="text-xs text-gray-500">
                                Accepted formats: PDF, JPG, PNG (max 5MB)
                              </p>
                            </div>
                          </FormControl>
                          <FormMessage />
                          {getBackendErrors('idVerification').map((error, index) => (
                            <p key={index} className="text-sm font-medium text-destructive mt-1">
                              {error}
                            </p>
                          ))}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="certification"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-gray-700">
                            <Award className="h-5 w-5 text-homehelp-500" />
                            Professional Certification
                          </FormLabel>
                          <FormControl>
                            <div className="flex flex-col gap-2">
                              <Input 
                                type="file" 
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => field.onChange(e.target.files?.[0])}
                                className="bg-white border-gray-300 focus:border-homehelp-500 focus:ring-homehelp-500 h-12 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-homehelp-50 file:text-homehelp-700 hover:file:bg-homehelp-100"
                              />
                              <p className="text-xs text-gray-500">
                                Accepted formats: PDF, JPG, PNG (max 5MB)
                              </p>
                            </div>
                          </FormControl>
                          <FormMessage />
                          {getBackendErrors('certification').map((error, index) => (
                            <p key={index} className="text-sm font-medium text-destructive mt-1">
                              {error}
                            </p>
                          ))}
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-6">
                  <Button 
                    variant="outline" 
                    asChild
                    className="w-full sm:w-auto border-gray-300 hover:bg-gray-50 h-12 px-6"
                  >
                    <Link href="/">
                      Back to Home
                    </Link>
                  </Button>
                  <Button 
                    type="submit" 
                    className="w-full sm:w-auto bg-gradient-to-r from-homehelp-600 to-homehelp-700 hover:from-homehelp-700 hover:to-homehelp-800 text-white h-12 px-8 text-lg font-medium shadow-md hover:shadow-lg transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Complete Registration"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Login Link */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="font-semibold text-homehelp-600 hover:text-homehelp-700 underline underline-offset-4"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
