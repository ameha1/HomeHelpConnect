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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { HomeIcon, Loader2, Mail, Phone, MapPin, User, Lock, Bell, AlertCircle } from "lucide-react"
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

// Define the profile form schema using zod
const profileFormSchema = z.object({
  fullName: z.string().min(1, { message: "Full name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
});

const passwordFormSchema = z
  .object({
    current_password: z.string().min(1, {
      message: "Current password is required.",
    }),
    new_password: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.new_password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

const notificationSchema = z.object({
  emailBookingConfirmations: z.boolean(),
  emailServiceReminders: z.boolean(),
  emailPromotions: z.boolean(),
  pushNewMessages: z.boolean(),
  pushStatusUpdates: z.boolean(),
})

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<() => void>(() => () => {})
  const { toast } = useToast()
  const { user } = useAuth()
  const userEmail = user?.email || ''
  const { update } = useSession()
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile>({
      id: user?.userId || '',
      email: userEmail,
      full_name: user?.token || '',
      avatarUrl: '/placeholder-user.jpg'
    });

  // Fetch user data and set form defaults
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: (user as any)?.fullName || "",
      email: user?.email || "",
      phone: (user as any)?.phone || "",
      address: (user as any)?.address || "",
      bio: (user as any)?.bio || "",
    },
  })

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirmPassword: "",
    },
  })

  const notificationForm = useForm<z.infer<typeof notificationSchema>>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailBookingConfirmations: (user as any)?.notificationPreferences?.emailBookingConfirmations ?? true,
      emailServiceReminders: (user as any)?.notificationPreferences?.emailServiceReminders ?? true,
      emailPromotions: (user as any)?.notificationPreferences?.emailPromotions ?? false,
      pushNewMessages: (user as any)?.notificationPreferences?.pushNewMessages ?? true,
      pushStatusUpdates: (user as any)?.notificationPreferences?.pushStatusUpdates ?? true,
    },
  })

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (user?.userId) {
          const response = await api.get(`/users/${user.userId}/profile`);
          setUserProfile({
            id: user.userId,
            email: userEmail,
            full_name: response.data.full_name || user?.token || '',
            avatarUrl: response.data.avatar_url || '/placeholder-user.jpg'
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUserProfile(prev => ({
          ...prev,
          avatarUrl: '/placeholder-user.jpg'
        }));
      }
    };
  
    fetchUserProfile();
  }, [user, userEmail]);

  useEffect(() => {
    async function fetchUserProfile() {
      setIsProfileLoading(true);
      try {
        const response = await api.get("/users/me/profile");
        profileForm.reset({
          fullName: response.data.fullName || "",
          email: response.data.email || "",
          phone: response.data.phone || "",
          address: response.data.address || "",
          bio: response.data.bio || "",
        });
        if (response.data.avatar) {
          setAvatarUrl(response.data.avatar);
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setIsProfileLoading(false);
      }
    }
  
    fetchUserProfile();
  }, []);

  async function onProfileSubmit(values: z.infer<typeof profileFormSchema>) {
    setPendingAction(() => async () => {
      setIsLoading(true)
      try {
        const payload = {
          full_name: values.fullName,
          email: values.email,
          phone_number: values.phone,
          address: values.address,
          bio: values.bio
        };
        const response = await api.patch("/users/me", payload);
        await update();
        
        toast({
          title: "Profile updated",
          description: "Your profile information has been updated successfully.",
          variant: "default",
        });
      } catch (error) {
        console.error("Profile update error:", error);
        toast({
          title: "Update failed",
          description: error instanceof Error ? error.message : "Failed to update profile",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    });
    setIsConfirmOpen(true);
  }

  async function onPasswordSubmit(values: z.infer<typeof passwordFormSchema>) {
    setPendingAction(() => async () => {
      setIsLoading(true)
      try {
        await api.post("/change-password", {
          current_password: values.current_password,
          new_password: values.new_password,
          confirm_password: values.confirmPassword,
        })
        toast({
          title: "Password updated",
          description: "Your password has been changed successfully.",
          variant: "default",
        })
        passwordForm.reset({
          current_password: "",
          new_password: "",
          confirmPassword: "",
        })
      } catch (error) {
        console.error("Password change error:", error)
        toast({
          title: "Password change failed",
          description: error instanceof Error ? error.message : "Failed to change password",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    });
    setIsConfirmOpen(true);
  }

  async function onNotificationSubmit(values: z.infer<typeof notificationSchema>) {
    setPendingAction(() => async () => {
      setIsLoading(true)
      try {
        await api.patch("/users/notification-preferences", values)
        toast({
          title: "Preferences saved",
          description: "Your notification preferences have been updated.",
          variant: "default",
        })
      } catch (error) {
        console.error("Notification preferences error:", error)
        toast({
          title: "Update failed",
          description: "Failed to update notification preferences",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    });
    setIsConfirmOpen(true);
  }

  function handleAvatarUrlUpdate(avatar_url: string) {
    setAvatarLoading(false)
    setAvatarUrl(avatar_url)
    if (typeof update === "function") {
      update()
    }
    toast({
      title: "Avatar updated",
      description: "Your profile picture has been updated.",
      variant: "default",
    })
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    
    formData.append('avatar', file);

    setAvatarLoading(true);
    
    try {
      const response = await api.post("/users/avatar", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setAvatarUrl(response.data.avatar_url);
      handleAvatarUrlUpdate(response.data.avatar_url);
      
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Avatar upload failed",
        description: error instanceof Error ? error.message : "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleConfirm = async () => {
    await pendingAction();
    setIsConfirmOpen(false);
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account information and preferences
          </p>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/dashboard/homeowner" className="flex items-center">
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
          <TabsTrigger value="password" className="py-2">
            <Lock className="mr-2 h-4 w-4" />
            Password
          </TabsTrigger>
          <TabsTrigger value="notifications" className="py-2">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Profile Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information
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
                                  src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${userProfile.avatarUrl}` || (user as any)?.avatar || "/placeholder-user.jpg"} 
                                  alt="Profile" 
                                />
                                <AvatarFallback className="bg-primary text-white text-2xl font-medium">
                                  {(user?.email?.charAt(0)?.toUpperCase()) || "U"}
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
                                  Change Avatar
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
                                name="fullName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-muted-foreground" />
                                      Full Name
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field} 
                                        placeholder="John Doe" 
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
                                        placeholder="john@example.com" 
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
                                  name="address"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        Address
                                      </FormLabel>
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
                              </div>
                              
                              <FormField
                                control={profileForm.control}
                                name="bio"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Bio</FormLabel>
                                    <FormControl>
                                      <Textarea 
                                        placeholder="Tell us a little about yourself" 
                                        className="resize-none bg-background min-h-[100px]" 
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      This will be visible to service providers you interact with.
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

        <TabsContent value="password">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Password & Security</CardTitle>
              <CardDescription>
                Change your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form 
                  onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} 
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="current_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              {...field} 
                              placeholder="Enter your current password" 
                              className="bg-background"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={passwordForm.control}
                      name="new_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              {...field} 
                              placeholder="Enter your new password" 
                              className="bg-background"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Password must be at least 8 characters long and contain a mix of letters, numbers, and symbols.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              {...field} 
                              placeholder="Confirm your new password" 
                              className="bg-background"
                            />
                          </FormControl>
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
                          Updating...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Notification Preferences</CardTitle>
              <CardDescription>
                Configure how you receive notifications from our platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...notificationForm}>
                <form 
                  onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} 
                  className="space-y-8"
                >
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        Email Notifications
                      </h3>
                      <Separator className="my-3" />
                      <div className="space-y-4">
                        <FormField
                          control={notificationForm.control}
                          name="emailBookingConfirmations"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Booking Confirmations
                                </FormLabel>
                                <FormDescription>
                                  Receive emails when your bookings are confirmed
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
                          control={notificationForm.control}
                          name="emailServiceReminders"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Service Reminders
                                </FormLabel>
                                <FormDescription>
                                  Get reminders before your scheduled services
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
                          control={notificationForm.control}
                          name="emailPromotions"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Promotional Emails
                                </FormLabel>
                                <FormDescription>
                                  Receive special offers and promotions
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
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        Push Notifications
                      </h3>
                      <Separator className="my-3" />
                      <div className="space-y-4">
                        <FormField
                          control={notificationForm.control}
                          name="pushNewMessages"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  New Messages
                                </FormLabel>
                                <FormDescription>
                                  Get notified when you receive new messages
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
                          control={notificationForm.control}
                          name="pushStatusUpdates"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Status Updates
                                </FormLabel>
                                <FormDescription>
                                  Receive updates about your service status
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
                        "Save Preferences"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Changes</DialogTitle>
            <DialogDescription>
              Are you sure you want to save these changes? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}