"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HomeIcon, Wrench, Calendar, MessageSquare, Settings, LogOut, DollarSign, Users, Star, ChevronDown, Bell, Search, AlertCircle, AlertTriangle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { AddServiceDialog } from "@/components/add-service-dialog"
import { RatingDialog } from "@/components/rating-dialog"
import { useState, useEffect } from "react"
import { Service, getServicesByProvider, createService } from "@/lib/api"
import api from '@/lib/api'
import { useRouter } from "next/navigation"
import { useAuth } from '../../context/auth-context'
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { BookingStatusBadge } from "@/components/booking-status-badge"
import Image from "next/image"

const ServiceImage = ({ src, alt, className = "" }: { 
  src: string, 
  alt: string, 
  className?: string 
}) => {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Image
        src={imgSrc || '/placeholder-service.jpg'}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setImgSrc('/placeholder-service.jpg')}
        unoptimized={imgSrc?.startsWith('/')}
      />
    </div>
  );
};

interface Booking {
  id: string;
  service_id: string;
  homeowner_id: string;
  serviceTitle: string;
  providerName: string;
  homeownerName?: string;
  clientId?: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  price: number;
  address: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  rating?: number;
  image?: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatarUrl?: string;
  status?: string;
  suspension_end_date?: string;
}

interface Review {
  id: string;
  booking_id: string;
  service_id: string;
  homeowner_id: string;
  homeowner_name: string;
  service_title: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface Warning {
  id: string;
  report_id: string;
  user_id: string;
  reason: string;
  created_at: string;
}

export default function ProviderDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const userEmail = user?.email || ''

  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userStatus, setUserStatus] = useState({
    isVerified: false,
    needsDocuments: false
  })
  const [idFile, setIdFile] = useState<File | null>(null)
  const [certFile, setCertFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<{ 
    text: string; 
    type: 'success' | 'error' 
  } | null>(null)
  const [activeTab, setActiveTab] = useState("services")
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: user?.userId || '',
    email: userEmail,
    full_name: user?.token || '',
    avatarUrl: '/placeholder-user.jpg'
  })
  const [bookings, setBookings] = useState<{ 
    upcoming: Booking[]; 
    pending: Booking[]; 
    completed: Booking[] 
  }>({ 
    upcoming: [], 
    pending: [], 
    completed: [] 
  })
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null)
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null)
  const [warnings, setWarnings] = useState<Warning[]>([])

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (user?.userId) {
          const response = await api.get(`/users/${user.userId}/profile`)
          setUserProfile({
            id: user.userId,
            email: userEmail,
            full_name: response.data.full_name || user?.token || '',
            avatarUrl: response.data.avatar_url || '/placeholder-user.jpg',
            status: response.data.status || 'active',
            suspension_end_date: response.data.suspension_end_date
          })
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
        setUserProfile(prev => ({
          ...prev,
          avatarUrl: '/placeholder-user.jpg'
        }))
      }
    }

    fetchUserProfile()
  }, [user, userEmail])

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const response = await api.get('/provider/status')
        setUserStatus({
          isVerified: response.data.is_verified,
          needsDocuments: response.data.needs_documents
        })
        if (response.data.is_verified && !response.data.needs_documents) {
          fetchProviderServices()
          fetchProviderBookings()
          fetchProviderReviews()
          fetchProviderWarnings()
        }
      } catch (error) {
        console.error('Error checking user status:', error)
      }
    }

    checkUserStatus()
  }, [router])

  const fetchProviderServices = async () => {
    setLoading(true)
    try {
      const data = await getServicesByProvider()
      const servicesWithImages = data.map(service => ({
        ...service,
        image: service.image 
          ? service.image.startsWith('http') 
            ? service.image 
            : `${process.env.NEXT_PUBLIC_BASE_URL || ''}${service.image}`
          : '/placeholder-service.jpg',
        rating: service.rating ?? 0,
        provider_name: service.provider_name || "Your Service",
        price: service.price ? Number(service.price) : 0
      }))
      setServices(servicesWithImages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetchProviderBookings = async () => {
    try {
      const response = await api.get('/bookings/provider')
      const { upcoming, past } = response.data

      const transformBooking = (booking: any) => ({
        id: booking.id.toString(),
        service_id: booking.service_id?.toString() || '',
        homeowner_id: booking.homeowner_id?.toString() || '',
        serviceTitle: booking.service_title || booking.serviceTitle || 
                     (booking.service?.title || 'Service'),
        providerName: booking.provider_name || booking.providerName || 
                     (booking.service?.provider?.user?.full_name || 'Provider'),
        homeownerName: booking.homeowner_name || 'Homeowner',
        providerId: booking.provider_id?.toString() || 
                   (booking.service?.provider?.user_id?.toString() || ''),
        scheduled_date: booking.scheduled_date || '',
        scheduled_time: booking.scheduled_time || booking.time || '',
        status: booking.status || 'pending',
        price: booking.price || 0,
        address: booking.address || '',
        notes: booking.notes,
        created_at: booking.created_at || new Date().toISOString(),
        updated_at: booking.updated_at || new Date().toISOString(),
        image: booking.service?.image ? 
              `${process.env.NEXT_PUBLIC_API_BASE_URL}${booking.service.image}` : 
              '/placeholder-service.jpg'
      })

      setBookings({
        upcoming: past.map(transformBooking).filter((b: Booking) => b.status === 'confirmed'),
        pending: past.map(transformBooking).filter((b: Booking) => b.status === 'pending'),
        completed: past.map(transformBooking).filter((b: Booking) => b.status === 'completed'),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings')
      console.error("Error fetching bookings:", err)
      setBookings({ upcoming: [], pending: [], completed: [] })
    }
  }

  const handleStatusChange = async (bookingId: string, newStatus: 'confirmed' | 'cancelled' | 'completed') => {
    try {
      setLoading(true)
      await api.patch(`/bookings/${bookingId}/status`, { status: newStatus })
      await fetchProviderBookings()
      toast({
        title: "Booking updated",
        description: `Booking has been ${newStatus === 'confirmed' ? 'accepted' : 
                     newStatus === 'cancelled' ? 'declined' : 'marked as completed'}.`,
      })
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update booking status",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUploadDocuments = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!idFile || !certFile) {
      setUploadMessage({ text: 'Please upload both documents', type: 'error' })
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('id_verification', idFile)
      formData.append('certification', certFile)

      const response = await api.post('/provider/upload-documents', formData)

      setUploadMessage({ 
        text: 'Documents uploaded successfully! Please wait for admin approval.', 
        type: 'success' 
      })
      setUserStatus(prev => ({ ...prev, needsDocuments: false }))
    } catch (error) {
      setUploadMessage({ 
        text: error instanceof Error ? error.message : 'Failed to upload documents', 
        type: 'error' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddService = async (serviceData: {
    title: string;
    description: string;
    price: string;
    image?: File;
  }) => {
    try {
      const formData = new FormData()
      formData.append('title', serviceData.title)
      formData.append('description', serviceData.description)
      formData.append('price', serviceData.price)
      if (serviceData.image) {
        formData.append('image', serviceData.image)
      }

      await api.post('/services', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      await fetchProviderServices()
      toast({
        title: "Service added",
        description: "Your new service has been added successfully.",
      })
    } catch (err) {
      console.error("Failed to add service:", err)
      throw err
    }
  }

  const updateService = async (serviceId: string, updatedService: Partial<Service>) => {
    try {
      await api.patch(`/services/${serviceId}`, updatedService)
      await fetchProviderServices()
      toast({
        title: "Service updated",
        description: "Your service has been successfully updated.",
      })
    } catch (error) {
      throw error
    }
  }

  const deleteService = async (serviceId: string) => {
    try {
      await api.delete(`/services/${serviceId}`)
      await fetchProviderServices()
      toast({
        title: "Service deleted",
        description: "Your service has been successfully removed.",
      })
    } catch (error) {
      throw error
    }
  }

  const fetchProviderReviews = async () => {
    try {
      const response = await api.get('/reviews/provider')
      const reviewsWithAvatars = response.data.map((review: any) => ({
        ...review,
      }))
      setReviews(reviewsWithAvatars)
    } catch (err) {
      console.error("Error fetching reviews:", err)
      setError(err instanceof Error ? err.message : 'Failed to fetch reviews')
    }
  }

  const fetchProviderWarnings = async () => {
    try {
      const response = await api.get('/warnings/provider')
      setWarnings(response.data.map((warning: any) => ({
        id: warning.id,
        report_id: warning.report_id,
        user_id: warning.user_id,
        reason: warning.reason,
        created_at: warning.created_at
      })))
    } catch (err) {
      console.error("Error fetching warnings:", err)
      setError(err instanceof Error ? err.message : 'Failed to fetch warnings')
    }
  }

  const EditServiceDialog = () => (
    <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Service</DialogTitle>
          <DialogDescription>
            Update your service details below.
          </DialogDescription>
        </DialogHeader>
        {editingService && (
          <form 
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                setLoading(true)
                const formData = new FormData(e.currentTarget)
                const updatedService = {
                  title: formData.get('title') as string,
                  description: formData.get('description') as string,
                  price: Number(formData.get('price')),
                  image: formData.get('image') as string || editingService.image
                }
                
                await updateService(editingService.id.toString(), updatedService)
                setShowEditDialog(false)
              } catch (error) {
                toast({
                  title: "Error",
                  description: error instanceof Error ? error.message : "Failed to update service",
                  variant: "destructive"
                })
              } finally {
                setLoading(false)
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="title">Service Title</Label>
              <Input 
                id="title" 
                name="title" 
                defaultValue={editingService.title} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                name="description" 
                defaultValue={editingService.description} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input 
                id="price" 
                name="price" 
                type="number" 
                defaultValue={editingService.price} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="image">Image URL (optional)</Label>
              <Input 
                id="image" 
                name="image" 
                type="url" 
                defaultValue={editingService.image} 
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )

  const BookingDetailsDialog = () => (
    <Dialog open={!!viewingBooking} onOpenChange={(open) => !open && setViewingBooking(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
          <DialogDescription>
            Detailed information about this completed booking
          </DialogDescription>
        </DialogHeader>
        {viewingBooking && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">{viewingBooking.serviceTitle}</h3>
                <p className="text-sm text-gray-500">For {viewingBooking.homeownerName}</p>
              </div>
              <BookingStatusBadge status={viewingBooking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled'} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Date</p>
                <p>{format(new Date(viewingBooking.scheduled_date), "MMMM d, yyyy")}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Time</p>
                <p>{viewingBooking.scheduled_time}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Price</p>
                <p>ETB {viewingBooking.price.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Address</p>
                <p>{viewingBooking.address}</p>
              </div>
            </div>
            
            {viewingBooking.notes && (
              <div>
                <p className="text-sm font-medium text-gray-500">Customer Notes</p>
                <p className="text-sm">{viewingBooking.notes}</p>
              </div>
            )}
            
            <div className="flex justify-end pt-4">
              <Button 
                variant="outline"
                onClick={() => setViewingBooking(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )

  const DeleteServiceConfirmation = () => (
    <Dialog open={!!serviceToDelete} onOpenChange={(open) => !open && setServiceToDelete(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This will permanently delete "{serviceToDelete?.title}" and cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={() => setServiceToDelete(null)}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={async () => {
              if (!serviceToDelete) return;
              try {
                setLoading(true);
                await deleteService(serviceToDelete.id.toString());
                await fetchProviderServices();
                toast({
                  title: "Service deleted",
                  description: "Your service has been successfully removed.",
                });
              } catch (error) {
                toast({
                  title: "Error",
                  description: error instanceof Error ? error.message : "Failed to delete service",
                  variant: "destructive"
                });
              } finally {
                setLoading(false);
                setServiceToDelete(null);
              }
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </>
            ) : "Confirm Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )

  if (userStatus.needsDocuments) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar className="bg-gradient-to-b from-indigo-900 to-indigo-800 text-white shadow-lg">
            <SidebarHeader className="border-b border-indigo-700">
              <div className="flex items-center gap-2 px-4 py-4">
                <HomeIcon className="h-6 w-6 text-white" />
                <span className="text-lg font-bold">HomeHelp Pro</span>
              </div>
            </SidebarHeader>
          </Sidebar>
          
          <div className="flex-1 p-8 flex items-center justify-center">
            <Card className="max-w-md w-full shadow-xl">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl">Complete Your Registration</CardTitle>
                <CardDescription className="text-gray-600">
                  Upload required documents to start using your provider dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUploadDocuments} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ID Verification</label>
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {idFile ? (
                              <p className="text-sm text-gray-500">{idFile.name}</p>
                            ) : (
                              <>
                                <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                </svg>
                                <p className="text-sm text-gray-500">
                                  <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-500">PDF, JPG, PNG (MAX. 5MB)</p>
                              </>
                            )}
                          </div>
                          <input 
                            type="file" 
                            accept=".pdf,.jpg,.jpeg,.png" 
                            onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                            className="hidden" 
                            required
                          />
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Professional Certification</label>
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {certFile ? (
                              <p className="text-sm text-gray-500">{certFile.name}</p>
                            ) : (
                              <>
                                <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                </svg>
                                <p className="text-sm text-gray-500">
                                  <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-500">PDF, JPG, PNG (MAX. 5MB)</p>
                              </>
                            )}
                          </div>
                          <input 
                            type="file" 
                            accept=".pdf,.jpg,.jpeg,.png" 
                            onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                            className="hidden" 
                            required
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {uploadMessage && (
                    <div className={`rounded-md p-3 ${
                      uploadMessage.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                    }`}>
                      <p className="text-sm">{uploadMessage.text}</p>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : 'Submit Documents'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarProvider>
    )
  }

  if (userProfile.status === 'suspended' && userProfile.suspension_end_date) {
    const suspensionEnd = new Date(userProfile.suspension_end_date)
    return (
      <SidebarProvider>
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar className="bg-gradient-to-b from-indigo-900 to-indigo-800 text-white shadow-lg">
            <SidebarHeader className="border-b border-indigo-700">
              <div className="flex items-center gap-2 px-4 py-4">
                <HomeIcon className="h-6 w-6 text-white" />
                <span className="text-lg font-bold">HomeHelp Pro</span>
              </div>
            </SidebarHeader>
          </Sidebar>
          
          <div className="flex-1 p-8 flex items-center justify-center">
            <Card className="max-w-md w-full shadow-xl">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-red-600">Account Suspended</CardTitle>
                <CardDescription className="text-gray-600">
                  Your account is temporarily suspended
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  <p className="text-sm">
                    Your account is suspended until {format(suspensionEnd, "MMMM d, yyyy")}.
                    Please address any outstanding warnings to prevent further action.
                  </p>
                </div>
                <p className="text-sm text-gray-500">
                  If you have questions, contact support at support@homehelppro.com
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
        <Sidebar className="bg-gradient-to-b from-indigo-900 to-indigo-800 text-white shadow-xl h-full">
          <SidebarHeader className="border-b border-indigo-700 px-4">
            <div className="flex items-center gap-2 py-4">
              <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                <div className="p-2 bg-white rounded-lg">
                  <HomeIcon className="h-5 w-5 text-indigo-700" />
                </div>
                <span className="text-lg font-bold">HomeHelp Pro</span>
              </Link>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="px-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive>
                  <Link href="/dashboard/provider" className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/10">
                    <div className="p-1.5 rounded-md bg-white/10 group-hover:bg-white/20 transition-colors">
                      <HomeIcon className="h-4 w-4" />
                    </div>
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/provider/services" className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/10">
                    <div className="p-1.5 rounded-md bg-white/10 group-hover:bg-white/20 transition-colors">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <span>My Services</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/provider/bookings" className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/10">
                    <div className="p-1.5 rounded-md bg-white/10 group-hover:bg-white/20 transition-colors">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <span>Bookings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/provider/messages" className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/10">
                    <div className="p-1.5 rounded-md bg-white/10 group-hover:bg-white/20 transition-colors">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <span>Messages</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/provider/settings" className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/10">
                    <div className="p-1.5 rounded-md bg-white/10 group-hover:bg-white/20 transition-colors">
                      <Settings className="h-4 w-4" />
                    </div>
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          
          <SidebarFooter className="border-t border-indigo-700 p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <Avatar className="h-9 w-9 border-2 border-white">
                    <AvatarImage src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${userProfile.avatarUrl}`} alt="User" />
                    <AvatarFallback className="bg-indigo-600">
                      {userProfile.full_name 
                        ? userProfile.full_name.split(' ').map(n => n[0]).join('')
                        : userProfile.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="text-sm font-medium truncate">HomeHelp Connect</p>
                    <p className="text-xs text-white/70 truncate">{userEmail}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-white/70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/provider/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/login" className="cursor-pointer text-red-600 hover:text-red-700">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm shrink-0">
            <SidebarTrigger className="text-gray-700 hover:text-indigo-600" />
            
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="search"
                placeholder="Search services, bookings..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <button className="p-2 rounded-full hover:bg-gray-100 relative">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 focus:outline-none">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${userProfile.avatarUrl}`} alt="User" />
                      <AvatarFallback className="bg-indigo-600">
                        {userProfile.full_name 
                          ? userProfile.full_name.split(' ').map(n => n[0]).join('')
                          : userProfile.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-sm font-medium">Provider</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/provider/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/login" className="cursor-pointer text-red-600 hover:text-red-700">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Welcome back, {userProfile.full_name || userEmail.split('@')[0]}</h1>
              <p className="text-gray-600">Here's what's happening with your business today</p>
            </div>
            
            <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Earnings</CardTitle>
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                    Br
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">ETB 1,234</div>
                  <p className="text-xs text-green-500 mt-1">+$256 from last month</p>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Completed Jobs</CardTitle>
                  <div className="p-2 rounded-lg bg-green-100 text-green-600">
                    <Wrench className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{bookings.completed.length}</div>
                  <p className="text-xs text-green-500 mt-1">
                    {bookings.completed.length > 0 ? 
                    `+${bookings.completed.length} this month` : 'No completed jobs yet'}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Upcoming Jobs</CardTitle>
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <Calendar className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{bookings.upcoming.length}</div>
                  <p className="text-xs text-green-500 mt-1">
                    {bookings.upcoming.length > 0 ? 
                    `${bookings.upcoming.length} scheduled` : 'No upcoming jobs'}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Pending Requests</CardTitle>
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                    <Users className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{bookings.pending.length}</div>
                  <p className="text-xs text-green-500 mt-1">
                    {bookings.pending.length > 0 ? 
                    `${bookings.pending.length} to review` : 'No pending requests'}
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <Tabs defaultValue="services" className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:grid-cols-6 gap-1 bg-gray-100 p-1 rounded-lg">
                  <TabsTrigger 
                    value="upcoming" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-1.5 text-sm font-medium transition-all"
                    onClick={() => setActiveTab("upcoming")}
                  >
                    Upcoming
                  </TabsTrigger>
                  <TabsTrigger 
                    value="pending" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-1.5 text-sm font-medium transition-all"
                    onClick={() => setActiveTab("pending")}
                  >
                    Pending
                  </TabsTrigger>
                  <TabsTrigger 
                    value="completed" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-1.5 text-sm font-medium transition-all"
                    onClick={() => setActiveTab("completed")}
                  >
                    Completed
                  </TabsTrigger>
                  <TabsTrigger 
                    value="services" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-1.5 text-sm font-medium transition-all"
                    onClick={() => setActiveTab("services")}
                  >
                    My Services
                  </TabsTrigger>
                  <TabsTrigger 
                    value="reviews" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-1.5 text-sm font-medium transition-all"
                    onClick={() => setActiveTab("reviews")}
                  >
                    Reviews
                  </TabsTrigger>
                  <TabsTrigger 
                    value="warnings" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-1.5 text-sm font-medium transition-all"
                    onClick={() => setActiveTab("warnings")}
                  >
                    Warnings
                  </TabsTrigger>
                </TabsList>
                
                <AddServiceDialog onSubmit={handleAddService} />
              </div>

              <TabsContent value="services" className="space-y-6">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : error ? (
                  <div className="rounded-lg bg-red-50 p-4">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-5 w-5" />
                      <div>
                        <p className="font-medium">Error loading services</p>
                        <p className="text-sm">{error}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => window.location.reload()}
                        >
                          Retry
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : services.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                    <div className="p-4 bg-indigo-100 rounded-full">
                      <Wrench className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No services yet</h3>
                    <p className="text-gray-500 max-w-md">
                      You haven't added any services yet. Get started by adding your first service to attract customers.
                    </p>
                    
                    <AddServiceDialog onSubmit={handleAddService} />
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {services.map((service) => (
                      <Card key={service.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                        <div className="relative h-48 w-full bg-gray-100 group">
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${service.image}`}
                            alt={service.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-service.jpg';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                          <div className="absolute bottom-4 left-4 right-4">
                            <h3 className="text-lg font-bold text-white">{service.title}</h3>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium text-white">
                                {(service.rating ?? 0).toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm text-gray-500">Your Service</span>
                            <span className="text-lg font-bold text-indigo-600">
                              {Number(service.price).toFixed(2)} Birr
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                            {service.description}
                          </p>
                          <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>Added {new Date(service.created_at).toLocaleDateString()}</span>
                            <span>ID: {service.id}</span>
                          </div>
                        </CardContent>
                        
                        <CardFooter className="flex justify-between gap-2 p-4 border-t">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => {
                              setEditingService(service);
                              setShowEditDialog(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => setServiceToDelete(service)}
                          >
                            Delete
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="upcoming" className="space-y-4">
                {bookings.upcoming.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                    <div className="p-4 bg-blue-100 rounded-full">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No upcoming jobs</h3>
                    <p className="text-gray-500 max-w-md">
                      You don't have any upcoming bookings. New bookings will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {bookings.upcoming.map((booking) => (
                      <Card key={booking.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                        <div className="relative h-40 w-full bg-gray-100 group">
                          <div className="absolute inset-0 bg-gradient-to-t from-green-400/60 to-transparent"></div>
                          <div className="absolute bottom-4 left-4 right-4">
                            <h3 className="text-lg font-bold text-white">
                              {booking.serviceTitle}
                            </h3>
                            <p className="text-sm text-white/90">
                              {booking.homeownerName}
                            </p>
                          </div>
                        </div>
                        
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center mb-2">
                            <BookingStatusBadge status={booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled'} />
                            <span className="text-sm font-medium text-gray-500">
                              {format(new Date(booking.scheduled_date), "MMMM d, yyyy")} at {booking.scheduled_time}
                            </span>
                          </div>
                          
                          {booking.notes && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              Notes: {booking.notes}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-lg font-bold text-indigo-600">
                              ETB {booking.price.toFixed(2)}
                            </span>
                          </div>
                        </CardContent>
                        
                        <CardFooter className="flex justify-between gap-2 p-4 border-t">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-indigo-500 text-indigo-600 hover:bg-indigo-50"
                            asChild
                          >
                            <Link href={`/dashboard/provider/messages?client=${booking.clientId}`}>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Contact
                            </Link>
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleStatusChange(booking.id, 'completed')}
                          >
                            Complete
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="pending" className="space-y-4">
                {(() => {
                  interface PendingBooking {
                    id: string;
                    serviceTitle: string;
                    clientName: string;
                    date: string | Date;
                    address: string;
                    price: number;
                  }
                  const pendingBookings: PendingBooking[] = bookings.pending.map((booking) => ({
                    id: booking.id,
                    serviceTitle: booking.serviceTitle,
                    clientName: booking.homeownerName || "Homeowner",
                    date: booking.scheduled_date,
                    address: booking.address,
                    price: booking.price,
                  }));
                  if (pendingBookings.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                        <div className="p-4 bg-yellow-100 rounded-full">
                          <Users className="h-6 w-6 text-yellow-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No pending requests</h3>
                        <p className="text-gray-500 max-w-md">
                          You don't have any pending booking requests. All caught up!
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {pendingBookings.map((booking) => (
                        <Card key={booking.id} className="hover:shadow-lg transition-shadow overflow-hidden group border-l-4 border-yellow-400">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">{booking.serviceTitle}</CardTitle>
                                <CardDescription className="text-sm">
                                  Request from {booking.clientName}
                                </CardDescription>
                              </div>
                              <span className="px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 font-medium">
                                Pending
                              </span>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                              <div className="flex items-center gap-2 text-gray-700">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span>
                                  {new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-700">
                                <HomeIcon className="h-4 w-4 text-gray-400" />
                                <span className="line-clamp-1">{booking.address}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center gap-1 text-sm">
                                <span className="font-medium">ETB {booking.price.toFixed(2)}</span>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleStatusChange(booking.id, 'confirmed')}
                                >
                                  Accept
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => handleStatusChange(booking.id, 'cancelled')}
                                >
                                  Decline
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })()}
              </TabsContent>
              
              <TabsContent value="completed" className="space-y-4">
                {(() => {
                  interface CompletedBooking {
                    id: string;
                    serviceTitle: string;
                    clientName: string;
                    date: string | Date;
                    status: string;
                    price: number;
                  }
                  const completedBookings: CompletedBooking[] = bookings.completed.map((booking) => ({
                    id: booking.id,
                    serviceTitle: booking.serviceTitle,
                    clientName: booking.homeownerName || "Homeowner",
                    date: booking.scheduled_date,
                    status: booking.status,
                    price: booking.price,
                  }));
                  if (completedBookings.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                        <div className="p-4 bg-green-100 rounded-full">
                          <Wrench className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No completed jobs yet</h3>
                        <p className="text-gray-500 max-w-md">
                          Your completed jobs will appear here once you start accepting bookings.
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {completedBookings.map((booking) => (
                        <Card key={booking.id} className="hover:shadow-lg transition-shadow overflow-hidden group">
                          <div className="relative h-32 w-full bg-gradient-to-r from-gray-50 to-indigo-50">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                            <div className="absolute top-4 left-4">
                              <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                                booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </span>
                            </div>
                          </div>
                          
                          <CardContent className="p-4 space-y-3">
                            <h3 className="text-lg font-bold text-gray-900">{booking.serviceTitle}</h3>
                            <p className="text-sm text-gray-600">For {booking.clientName}</p>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center gap-1 text-sm">
                                ETB
                                <span className="font-medium text-gray-900">{booking.price.toFixed(2)}</span>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="border-indigo-500 text-indigo-600 hover:bg-indigo-50"
                                onClick={() => {
                                  const completedBooking = bookings.completed.find(b => b.id === booking.id);
                                  if (completedBooking) {
                                    setViewingBooking(completedBooking);
                                  }
                                }}
                              >
                                Details
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })()}
              </TabsContent>
              
              <TabsContent value="reviews" className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                    <div className="p-4 bg-yellow-100 rounded-full">
                      <Star className="h-6 w-6 text-yellow-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No reviews yet</h3>
                    <p className="text-gray-500 max-w-md">
                      Your reviews from homeowners will appear here once you complete jobs.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <Card key={review.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-start gap-4 pb-2">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-medium">
                                Your Client - {review.homeowner_name}
                              </CardTitle>
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{review.rating.toFixed(1)}</span>
                              </div>
                            </div>
                            <CardDescription className="text-sm">
                              Your Service - {review.service_title}
                            </CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700">{review.comment}</p>
                          <div className="mt-2 text-xs text-gray-400">
                            {new Date(review.created_at).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="warnings" className="space-y-4">
                {warnings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                    <div className="p-4 bg-green-100 rounded-full">
                      <AlertTriangle className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No warnings</h3>
                    <p className="text-gray-500 max-w-md">
                      You have no active warnings. Keep providing excellent service!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {warnings.map((warning) => (
                      <Card key={warning.id} className="hover:shadow-md transition-shadow border-l-4 border-red-400">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">Warning Received</CardTitle>
                              <CardDescription className="text-sm">
                                Report ID: {warning.report_id}
                              </CardDescription>
                            </div>
                            <span className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-800 font-medium">
                              Active
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700 mb-2">{warning.reason}</p>
                          <div className="text-xs text-gray-400">
                            Issued on {new Date(warning.created_at).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </div>
                        </CardContent>
                        <CardFooter className="border-t p-4">
                          <p className="text-sm text-gray-500">
                            Please review and comply with our service guidelines to avoid further action.
                          </p>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

            </Tabs>
          </main>
        </div>
      </div>
      <EditServiceDialog />
      <BookingDetailsDialog />
      <DeleteServiceConfirmation />
    </SidebarProvider>
  )
}