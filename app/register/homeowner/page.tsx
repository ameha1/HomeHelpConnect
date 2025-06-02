"use client"

import { useState } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { HomeIcon, Loader2, CheckCircle2, Search, Shield, Clock, Star, MapPin, User, Mail, Lock, Phone, LocateFixed, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import axios from "axios"

const formSchema = z
  .object({
    fullName: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Please enter a valid email" }),
    password: z.string().min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
    phone: z.string().min(10, { message: "Phone must be at least 10 digits" }),
    address: z.string().min(5, { message: "Address must be at least 5 characters" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

const benefits = [
  {
    icon: Search,
    title: "Easy Service Discovery",
    description: "Find verified service providers in your area with detailed profiles and reviews.",
  },
  {
    icon: Shield,
    title: "Verified Providers",
    description: "All service providers are thoroughly vetted and background-checked.",
  },
  {
    icon: Clock,
    title: "Quick Response",
    description: "Get fast responses from providers and schedule services at your convenience.",
  },
  {
    icon: Star,
    title: "Quality Assurance",
    description: "Rate and review services to help maintain high quality standards.",
  },
]

export default function HomeownerRegistrationPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingLocation, setIsFetchingLocation] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      address: "",
    },
  })

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      })
      return
    }

    setIsFetchingLocation(true)
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          )
          
          const address = response.data.display_name
          form.setValue("address", address)
          
          toast({
            title: "Location found",
            description: "Your address has been automatically filled.",
          })
        } catch (error) {
          toast({
            title: "Error getting address",
            description: "We found your location but couldn't get the address details.",
            variant: "destructive",
          })
        } finally {
          setIsFetchingLocation(false)
        }
      },
      (error) => {
        toast({
          title: "Location access denied",
          description: "Please enable location services or enter your address manually.",
          variant: "destructive",
        })
        setIsFetchingLocation(false)
      }
    )
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const formData = new URLSearchParams()
      formData.append("full_name", values.fullName)
      formData.append("email", values.email)
      formData.append("phone_number", values.phone)
      formData.append("address", values.address)
      formData.append("password", values.password)

      await axios.post("http://localhost:8000/register/homeowner/", formData.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })

      toast({
        title: "Registration successful!",
        description: "Your homeowner account has been created.",
      })
      router.push("/login")
    } catch (error: any) {
      let errorMessage = "Registration failed"
      if (axios.isAxiosError(error)) {
        errorMessage =
          error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container relative grid min-h-screen flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col bg-gradient-to-br from-homehelp-600 to-homehelp-700 p-10 text-white lg:flex">
          <div className="absolute inset-0 bg-[url('/pattern.svg')] bg-[size:100px] opacity-10" />
          <Link href="/" className="flex items-center gap-2 group">
          <div className="relative z-20 flex items-center gap-3 text-lg font-medium">
            <HomeIcon className="h-8 w-8" />
            <span>HomeHelp</span>
          </div>
          </Link>
          <div className="relative z-20 mt-auto">
            <div className="space-y-8">
              <h2 className="text-4xl font-bold leading-tight">Why Choose HomeHelp?</h2>
              <p className="text-lg text-white/90">
                Get reliable home services with speed, safety, and quality you can count on.
              </p>
              <div className="space-y-6">
                {benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="bg-white/10 p-3 rounded-xl">
                      <benefit.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-1">{benefit.title}</h3>
                      <p className="text-white/80">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
            <div className="flex flex-col space-y-2 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                <HomeIcon className="h-8 w-8 text-homehelp-600" />
                <span className="text-2xl font-bold text-gray-800">HomeHelp</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Create Your Account
              </h1>
              <p className="text-sm text-gray-600">
                Start connecting with trusted service providers today
              </p>
            </div>

            <Card className="shadow-xl rounded-2xl border-0">
              <CardContent className="p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {[
                      { name: "fullName", label: "Full Name", icon: User },
                      { name: "email", label: "Email", type: "email", icon: Mail },
                      { name: "phone", label: "Phone Number", icon: Phone },
                    ].map(({ name, label, type = "text", icon: Icon }) => (
                      <FormField
                        key={name}
                        control={form.control}
                        name={name as keyof typeof formSchema["_type"]}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 text-gray-700">
                              <Icon className="h-5 w-5 text-homehelp-500" />
                              {label}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type={type}
                                className="bg-white border-gray-300 focus:border-homehelp-500 focus:ring-homehelp-500 h-12 pl-10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}

                    {/* Password Field with Toggle */}
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-gray-700">
                            <Lock className="h-5 w-5 text-homehelp-500" />
                            Password
                          </FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                className="bg-white border-gray-300 focus:border-homehelp-500 focus:ring-homehelp-500 h-12 pl-10"
                              />
                            </FormControl>
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-homehelp-600"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Confirm Password Field with Toggle */}
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-gray-700">
                            <Lock className="h-5 w-5 text-homehelp-500" />
                            Confirm Password
                          </FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                {...field}
                                type={showConfirmPassword ? "text" : "password"}
                                className="bg-white border-gray-300 focus:border-homehelp-500 focus:ring-homehelp-500 h-12 pl-10"
                              />
                            </FormControl>
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-homehelp-600"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Custom Address Field with Location Button */}
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-gray-700">
                            <MapPin className="h-5 w-5 text-homehelp-500" />
                            Address
                          </FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                {...field}
                                className="bg-white border-gray-300 focus:border-homehelp-500 focus:ring-homehelp-500 h-12 pl-10"
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3 text-xs"
                              onClick={getCurrentLocation}
                              disabled={isFetchingLocation}
                            >
                              {isFetchingLocation ? (
                                <>
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  Locating...
                                </>
                              ) : (
                                <>
                                  <LocateFixed className="mr-1 h-3 w-3" />
                                  Auto-fill
                                </>
                              )}
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-homehelp-600 to-homehelp-700 hover:from-homehelp-700 hover:to-homehelp-800 shadow-md mt-6"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mt-4">
                      <CheckCircle2 className="h-4 w-4 text-homehelp-600" />
                      Already have an account?
                      <Link
                        href="/login"
                        className="text-homehelp-600 underline font-medium hover:text-homehelp-700"
                      >
                        Log in
                      </Link>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <p className="px-8 text-center text-sm text-gray-600">
              By creating an account, you agree to our{" "}
              <Link href="/terms" className="underline underline-offset-4 hover:text-homehelp-600">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline underline-offset-4 hover:text-homehelp-600">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}