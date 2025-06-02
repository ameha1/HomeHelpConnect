"use client"

import { useState } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HomeIcon, Loader2, Mail, Phone, MapPin, User, Lock, Bell, Wrench, CreditCard, Calendar, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import api from "@/lib/api"
import { useAuth } from "../../../../app/context/auth-context"
import { useSession } from "next-auth/react"
import { useEffect } from "react"

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatarUrl?: string;
}

const profileFormSchema = z.object({
  businessName: z.string().min(2, {
    message: "Business name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().min(10, {
    message: "Please enter a valid phone number.",
  }),
  address: z.string().min(5, {
    message: "Address must be at least 5 characters.",
  }),
  serviceArea: z.string().min(1, {
    message: "Service area is required.",
  }),
  bio: z.string().optional(),
})

const servicesFormSchema = z.object({
  availableWeekends: z.boolean(),
  availableEvenings: z.boolean(),
  emergencyService: z.boolean(),
  minBookingNotice: z.string(),
  maxDailyBookings: z.string(),
})

const paymentFormSchema = z.object({
  payoutMethod: z.string(),
  payoutSchedule: z.string(),
  taxIdType: z.string(),
  taxIdNumber: z.string(),
})

export default function ProviderSettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  const userEmail = user?.email || ''
  const { update } = useSession()
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: user?.userId || '',
    email: userEmail,
    full_name: user?.token || '',
    avatarUrl: '/placeholder-user.jpg'
  })

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      businessName: "",
      email: userEmail,
      phone: "",
      address: "",
      serviceArea: "25",
      bio: "",
    },
  })

  const servicesForm = useForm<z.infer<typeof servicesFormSchema>>({
    resolver: zodResolver(servicesFormSchema),
    defaultValues: {
      availableWeekends: true,
      availableEvenings: false,
      emergencyService: true,
      minBookingNotice: "2",
      maxDailyBookings: "5",
    },
  })

  const paymentForm = useForm<z.infer<typeof paymentFormSchema>>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      payoutMethod: "bank",
      payoutSchedule: "weekly",
      taxIdType: "ssn",
      taxIdNumber: "",
    },
  })

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (user?.userId) {
          const response = await api.get(`/users/${user.userId}/profile`)
          setUserProfile({
            id: user.userId,
            email: userEmail,
            full_name: response.data.full_name || user?.token || '',
            avatarUrl: response.data.avatar_url || '/placeholder-user.jpg'
          })
          
          // Set form values if they exist in the response
          profileForm.reset({
            businessName: response.data.full_name || "",
            email: response.data.email || userEmail,
            phone: response.data.phone || "",
            address: response.data.address || "",
            serviceArea: response.data.serviceArea || "25",
            bio: response.data.bio || "",
          })
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        })
      } finally {
        setIsProfileLoading(false)
      }
    }

    fetchUserProfile()
  }, [user, userEmail])

  async function onProfileSubmit(values: z.infer<typeof profileFormSchema>) {
    setIsLoading(true)
    try {
      const response = await api.patch("/users/me", values)
      await update()
      toast({
        title: "Profile updated",
        description: "Your business profile has been updated successfully.",
        variant: "default",
      })
    } catch (error) {
      console.error("Profile update error:", error)
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function onServicesSubmit(values: z.infer<typeof servicesFormSchema>) {
    setIsLoading(true)
    try {
      await api.patch("/providers/service-settings", values)
      toast({
        title: "Service settings updated",
        description: "Your service settings have been updated.",
        variant: "default",
      })
    } catch (error) {
      console.error("Service settings error:", error)
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update service settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function onPaymentSubmit(values: z.infer<typeof paymentFormSchema>) {
    setIsLoading(true)
    try {
      await api.patch("/providers/payment-settings", values)
      toast({
        title: "Payment settings updated",
        description: "Your payment settings have been updated.",
        variant: "default",
      })
    } catch (error) {
      console.error("Payment settings error:", error)
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update payment settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append('avatar', file)

    setAvatarLoading(true)
    
    try {
      const response = await api.post("/users/avatar", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setAvatarUrl(response.data.avatar_url)
      setUserProfile(prev => ({
        ...prev,
        avatarUrl: response.data.avatar_url
      }))
      
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully.",
        variant: "default",
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Avatar upload failed",
        description: error instanceof Error ? error.message : "Failed to upload avatar",
        variant: "destructive",
      })
    } finally {
      setAvatarLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Provider Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your business profile and service settings
          </p>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/dashboard/provider" className="flex items-center">
            <HomeIcon className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50">
          <TabsTrigger value="profile" className="py-2">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="services" className="py-2">
            <Wrench className="mr-2 h-4 w-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="payments" className="py-2">
            <CreditCard className="mr-2 h-4 w-4" />
            Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Business Profile</CardTitle>
              <CardDescription>
                Update your business details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">   
                <div className="flex-1 w-full">
                  <Form {...profileForm}>
                    <form 
                      onSubmit={profileForm.handleSubmit(onProfileSubmit)} 
                      className="space-y-4"
                    >
                      {isProfileLoading ? (
                        <div className="flex justify-center items-center h-64">
                          <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col sm:flex-row items-center gap-6">
                            <div className="relative group">
                              <Avatar className="h-24 w-24 border-2 border-primary/20">
                                <AvatarImage 
                                  src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${userProfile.avatarUrl}`} 
                                  alt="Profile" 
                                />
                                <AvatarFallback className="bg-primary text-white text-2xl font-medium">
                                  {userProfile.full_name?.charAt(0)?.toUpperCase() || "P"}
                                </AvatarFallback>
                                {avatarLoading && (
                                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-full">
                                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                                  </div>
                                )}
                              </Avatar>
                              <div className="mt-3 flex flex-col items-center">
                                <label
                                  htmlFor="avatar-upload"
                                  className="cursor-pointer text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                                >
                                  Change Logo
                                  <input
                                    id="avatar-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAvatarChange}
                                    disabled={avatarLoading}
                                  />
                                </label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  JPG, PNG up to 2MB
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex-1 w-full space-y-4">
                              <FormField
                                control={profileForm.control}
                                name="businessName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-muted-foreground" />
                                      Business Name
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field} 
                                        placeholder="Your Business Name" 
                                        className="bg-background"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={profileForm.control}
                                name="email"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                      <Mail className="h-4 w-4 text-muted-foreground" />
                                      Email
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="email" 
                                        {...field} 
                                        className="bg-background"
                                        disabled
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={profileForm.control}
                                  name="phone"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        Phone Number
                                      </FormLabel>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          placeholder="+1 (555) 123-4567" 
                                          className="bg-background"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={profileForm.control}
                                  name="serviceArea"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        Service Area (miles)
                                      </FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Select service area" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="5">5 miles</SelectItem>
                                          <SelectItem value="10">10 miles</SelectItem>
                                          <SelectItem value="15">15 miles</SelectItem>
                                          <SelectItem value="25">25 miles</SelectItem>
                                          <SelectItem value="50">50+ miles</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              <FormField
                                control={profileForm.control}
                                name="address"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Business Address</FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field} 
                                        placeholder="123 Main St, Anytown" 
                                        className="bg-background"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={profileForm.control}
                                name="bio"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Business Description</FormLabel>
                                    <FormControl>
                                      <Textarea 
                                        placeholder="Describe your business and services..." 
                                        className="resize-none bg-background min-h-[100px]" 
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      This will be displayed on your profile page.
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <div className="flex justify-end pt-2">
                                <Button 
                                  type="submit" 
                                  disabled={isLoading}
                                  className="min-w-[150px]"
                                >
                                  {isLoading ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    "Save Changes"
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </form>
                  </Form>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Service Settings</CardTitle>
              <CardDescription>
                Configure your service availability and booking preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...servicesForm}>
                <form onSubmit={servicesForm.handleSubmit(onServicesSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={servicesForm.control}
                      name="availableWeekends"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Weekend Availability</FormLabel>
                            <FormDescription>
                              Make your services available on weekends.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={servicesForm.control}
                      name="availableEvenings"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Evening Availability</FormLabel>
                            <FormDescription>
                              Make your services available after 5:00 PM.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={servicesForm.control}
                      name="emergencyService"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Emergency Services</FormLabel>
                            <FormDescription>
                              Offer emergency services with priority booking.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={servicesForm.control}
                      name="minBookingNotice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Booking Notice</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select minimum notice" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1 hour</SelectItem>
                              <SelectItem value="2">2 hours</SelectItem>
                              <SelectItem value="4">4 hours</SelectItem>
                              <SelectItem value="8">8 hours</SelectItem>
                              <SelectItem value="24">24 hours</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Minimum notice required before a booking can be made.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={servicesForm.control}
                      name="maxDailyBookings"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Daily Bookings</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select maximum bookings" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="3">3 bookings</SelectItem>
                              <SelectItem value="5">5 bookings</SelectItem>
                              <SelectItem value="8">8 bookings</SelectItem>
                              <SelectItem value="10">10 bookings</SelectItem>
                              <SelectItem value="15">15+ bookings</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Maximum number of bookings you can accept per day.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end pt-2">
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="min-w-[150px]"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Settings"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Payment Settings</CardTitle>
              <CardDescription>
                Configure your payment methods and payout preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...paymentForm}>
                <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Payout Method
                      </h3>
                      <Separator className="my-3" />
                      <FormField
                        control={paymentForm.control}
                        name="payoutMethod"
                        render={({ field }) => (
                          <div className="space-y-4">
                            <FormItem className="flex items-center gap-2 p-4 rounded-lg border">
                              <FormControl>
                                <input 
                                  type="radio" 
                                  id="bank" 
                                  value="bank" 
                                  checked={field.value === "bank"} 
                                  onChange={() => field.onChange("bank")} 
                                  className="h-4 w-4"
                                />
                              </FormControl>
                              <FormLabel className="text-base font-normal">
                                Bank Account (Direct Deposit)
                              </FormLabel>
                            </FormItem>
                            
                            <FormItem className="flex items-center gap-2 p-4 rounded-lg border">
                              <FormControl>
                                <input 
                                  type="radio" 
                                  id="paypal" 
                                  value="paypal" 
                                  checked={field.value === "paypal"} 
                                  onChange={() => field.onChange("paypal")} 
                                  className="h-4 w-4"
                                />
                              </FormControl>
                              <FormLabel className="text-base font-normal">
                                PayPal
                              </FormLabel>
                            </FormItem>
                          </div>
                        )}
                      />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
                        <Calendar className="h-5 w-5 text-primary" />
                        Payout Schedule
                      </h3>
                      <Separator className="my-3" />
                      <FormField
                        control={paymentForm.control}
                        name="payoutSchedule"
                        render={({ field }) => (
                          <div className="space-y-2">
                            <FormItem className="flex items-center gap-2 p-4 rounded-lg border">
                              <FormControl>
                                <input 
                                  type="radio" 
                                  id="weekly" 
                                  value="weekly" 
                                  checked={field.value === "weekly"} 
                                  onChange={() => field.onChange("weekly")} 
                                  className="h-4 w-4"
                                />
                              </FormControl>
                              <FormLabel className="text-base font-normal">
                                Weekly (Every Monday)
                              </FormLabel>
                            </FormItem>
                            
                            <FormItem className="flex items-center gap-2 p-4 rounded-lg border">
                              <FormControl>
                                <input 
                                  type="radio" 
                                  id="biweekly" 
                                  value="biweekly" 
                                  checked={field.value === "biweekly"} 
                                  onChange={() => field.onChange("biweekly")} 
                                  className="h-4 w-4"
                                />
                              </FormControl>
                              <FormLabel className="text-base font-normal">
                                Bi-weekly (Every other Monday)
                              </FormLabel>
                            </FormItem>
                            
                            <FormItem className="flex items-center gap-2 p-4 rounded-lg border">
                              <FormControl>
                                <input 
                                  type="radio" 
                                  id="monthly" 
                                  value="monthly" 
                                  checked={field.value === "monthly"} 
                                  onChange={() => field.onChange("monthly")} 
                                  className="h-4 w-4"
                                />
                              </FormControl>
                              <FormLabel className="text-base font-normal">
                                Monthly (1st of each month)
                              </FormLabel>
                            </FormItem>
                          </div>
                        )}
                      />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
                        <FileText className="h-5 w-5 text-primary" />
                        Tax Information
                      </h3>
                      <Separator className="my-3" />
                      <div className="space-y-4">
                        <FormField
                          control={paymentForm.control}
                          name="taxIdType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tax ID Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Select tax ID type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="ssn">Social Security Number (SSN)</SelectItem>
                                  <SelectItem value="ein">Employer Identification Number (EIN)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={paymentForm.control}
                          name="taxIdNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tax ID Number</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  {...field} 
                                  placeholder="Enter your tax ID number" 
                                  className="bg-background"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-2">
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="min-w-[150px]"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Settings"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
