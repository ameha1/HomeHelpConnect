"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HomeIcon, Search, Star, Calendar, MessageSquare, Settings, LogOut, ChevronDown, Bell, Wrench, AlertCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { RatingDialog } from "@/components/rating-dialog"
import api from "@/lib/api"
import { ReviewDialog } from "@/components/review-dialogue"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"

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
import { NotificationsPanel } from "@/components/notifications-panel"
import BookingDialog from "@/components/booking-dialog"
import { ServiceDetailsDialog } from "@/components/service-details-dialog"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getServices } from "@/lib/api"
import { useAuth } from '../../context/auth-context'
import { getBookings, cancelBooking, createBooking } from "@/lib/api"
import { format } from "date-fns"
import { BookingStatusBadge } from "@/components/booking-status-badge"
import { toast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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

export default function HomeownerDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const userEmail = user?.email || ''

  interface Review {
  id: string;
  booking_id: string;
  service_id: string;
  homeowner_id: string;
  rating: number;
  review_text?: string;
  created_at: string;
  homeowner_name: string;
  }

  interface Service {
    id: number;
    title: string;
    description: string;
    price: number;
    created_at?: string;
    provider_id?: number;
    image?: string;
    provider_name?: string;
    rating?: number;
    reviews?: Review[];
  }

  interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatarUrl?: string;
  }

  interface DashboardStats {
  totalBookings: number;
  activeBookings: number;
  reviewsGiven: number;
  unreadMessages: number;
}

interface Booking {
  id: string;
  service_id: string;
  homeowner_id: string;
  serviceTitle: string;
  providerName: string;
  homeownerName?: string;
  providerId: string;
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
  review?: Review;
}

interface ReportData {
  bookingId: string;
  title: string;
  description: string;
}

  const [recommendedServices, setRecommendedServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: user?.userId || '',
    email: userEmail,
    full_name: user?.token || '',
    avatarUrl: '/placeholder-user.jpg'
  });
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
  totalBookings: 0,
  activeBookings: 0,
  reviewsGiven: 0,
  unreadMessages: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedBookingForReport, setSelectedBookingForReport] = useState<Booking | null>(null);

  const [isLoadingBookings, setIsLoadingBookings] = useState(true)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [bookings, setBookings] = useState<{ upcoming: Booking[]; past: Booking[] }>({ upcoming: [], past: [] });

  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [selectedBookingForDispute, setSelectedBookingForDispute] = useState<Booking | null>(null);

useEffect(() => {
  const fetchDashboardStats = async () => {
    try {
      setStatsLoading(true);
      const [bookingsRes, reviewsRes, messagesRes] = await Promise.all([
        api.get('/bookings/stats'),
        api.get('/reviews/stats'),
        api.get('/messages/stats')
      ]);

      setStats({
        totalBookings: bookingsRes.data.total_bookings || 0,
        activeBookings: bookingsRes.data.active_bookings || 0,
        reviewsGiven: reviewsRes.data.reviews_given || 0,
        unreadMessages: messagesRes.data.unread_messages || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  fetchDashboardStats();
}, []);



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
    const fetchServices = async () => {
          try {
            const data = await getServices();
            console.log(data);
            
            const servicesWithImagesAndReviews = await Promise.all(
              data.map(async (service) => {
                try {
                  // Fetch reviews for each service
                  const reviewsResponse = await api.get(`bookings/services/${service.id}/reviews`);
                  
                  const reviews = reviewsResponse.data.map((review: any) => ({
                    id: review.id,
                    homeowner_id: review.homeowner_id,
                    homeowner_name: review.homeowner_name || 'Anonymous',
                    rating: review.rating,
                    review_text: review.review_text,
                    created_at: review.created_at
                  }));

                  return {
                    ...service,
                    image: service.image 
                      ? service.image.startsWith('http') 
                        ? service.image 
                        : `${process.env.NEXT_PUBLIC_BASE_URL || ''}${service.image}`
                      : '/placeholder-service.jpg',
                    reviews,
                    // Calculate average rating if not provided
                    rating: service.rating ?? 
                          (reviews.length > 0 
                            ? reviews.reduce((sum: number, review: Review) => sum + review.rating, 0) / reviews.length 
                            : 0)
                  };
                } catch (error) {
                  console.error(`Error fetching reviews for service ${service.id}:`, error);
                  return {
                    ...service,
                    image: service.image 
                      ? service.image.startsWith('http') 
                        ? service.image 
                        : `${process.env.NEXT_PUBLIC_BASE_URL || ''}${service.image}`
                      : '/placeholder-service.jpg',
                    reviews: [],
                    rating: service.rating ?? 0
                  };
                }
              })
            );
            
            setRecommendedServices(servicesWithImagesAndReviews);
            setFilteredServices(servicesWithImagesAndReviews);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
          } finally {
            setLoading(false);
          }
        };
        fetchServices()
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredServices(recommendedServices);
    } else {
      const filtered = recommendedServices.filter(service => 
        service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (service.provider_name && service.provider_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredServices(filtered);
    }
  }, [searchTerm, recommendedServices]);

const fetchBookings = async () => {
  setIsLoadingBookings(true);
  setBookingError(null);

  try {
    const response = await getBookings();

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
      image: `${process.env.NEXT_PUBLIC_API_BASE_URL}${booking.service_image}`,
      review: booking.review ? {
        id: booking.review.id,
        booking_id: booking.review.booking_id,
        service_id: booking.review.service_id,
        homeowner_id: booking.review.homeowner_id,
        rating: booking.review.rating,
        review_text: booking.review.review_text,
        created_at: booking.review.created_at,
        homeowner_name: booking.homeowner_name || 'Homeowner'
      } : undefined
    });

    setBookings({
      upcoming: response.upcoming.map(transformBooking),
      past: response.past.map(transformBooking)
    });
  } catch (error) {
    console.error('Error loading bookings:', error);
    setBookingError(
      error instanceof Error 
        ? error.message 
        : 'Failed to load bookings. Please try again later.'
    );
  } finally {
    setIsLoadingBookings(false);
  }
};

useEffect(() => {
  fetchBookings();
}, []);

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await cancelBooking(bookingId);
      setBookings(prev => ({
        upcoming: prev.upcoming.filter(b => b.id !== bookingId),
        past: [...prev.past, prev.upcoming.find(b => b.id === bookingId)!]
      }));
      toast({ title: "Booking canceled successfully", variant: "default" });
    } catch (err) {
      console.error('Cancel booking error:', err);
      toast({ 
        title: "Failed to cancel booking", 
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive" 
      });
    }
  };

  const handleCreateBooking = async (bookingData: {
    service_id: string;
    scheduled_date: string;
    scheduled_time: string;
    address: string;
    notes?: string;
  }) => {
    try {
      setIsLoadingBookings(true);
      setBookingError(null);
      
      const newBooking = await createBooking({
        service_id: bookingData.service_id,
        scheduled_date: bookingData.scheduled_date,
        scheduled_time: bookingData.scheduled_time,
        address: bookingData.address,
        notes: bookingData.notes
      });

      const transformedBooking = {
        id: newBooking.id.toString(),
        service_id: newBooking.service_id?.toString() || '',
        homeowner_id: newBooking.homeowner_id?.toString() || '',
        serviceTitle: newBooking.service_title || newBooking.serviceTitle || 'Service',
        providerName: newBooking.provider_name || newBooking.providerName || 'Provider',
        homeownerName: newBooking.homeowner_name || 'Homeowner',
        providerId: newBooking.provider_id,
        scheduled_date: newBooking.scheduled_date || '',
        scheduled_time: newBooking.scheduled_time || '',
        status: newBooking.status || 'pending',
        price: newBooking.price || 0,
        address: newBooking.address || '',
        notes: newBooking.notes,
        created_at: newBooking.created_at || new Date().toISOString(),
        updated_at: newBooking.updated_at || new Date().toISOString(),
        image: `${process.env.NEXT_PUBLIC_API_BASE_URL}${newBooking.service_image}`
      };

      setBookings(prev => ({
        upcoming: [...prev.upcoming, transformedBooking],
        past: prev.past
      }));

      toast({
        title: "Booking created successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Failed to create booking",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive"
      });
    } finally {
      setIsLoadingBookings(false);
    }
  };

  const handleRateService = async (bookingId: string, rating: number) => {
    try {
      const response = await api.post(`/bookings/${bookingId}/rate`, { rating });
      
      setBookings(prev => ({
        upcoming: prev.upcoming,
        past: prev.past.map(booking => 
          booking.id === bookingId ? { ...booking, rating } : booking
        )
      }));
      
      toast({
        title: "Rating submitted",
        description: "Thank you for your feedback!",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Rating failed",
        description: error instanceof Error ? error.message : "Failed to submit rating",
        variant: "destructive"
      });
    }
  };

  const handleReviewSubmit = async (bookingId: string, rating: number, reviewText: string) => {
  try {
    const response = await api.post(`/bookings/${bookingId}/reviews`, {
      rating,
      review_text: reviewText
    });
    
    setBookings(prev => ({
      upcoming: prev.upcoming,
      past: prev.past.map(booking => 
        booking.id === bookingId 
          ? { ...booking, review: response.data } 
          : booking
      )
    }));
    
    // Also update the service rating if needed
    if (selectedBookingForReview) {
      setRecommendedServices(prev => 
        prev.map(service => 
          service.id.toString() === selectedBookingForReview.service_id
            ? { ...service, rating: response.data.rating } // Update average rating
            : service
        )
      );
    }
  } catch (error) {
    throw error;
  }
};

const handleReportSubmit = async (title: string, description: string) => {

  try {
    if (!selectedBookingForReport) return;
    
    const response = await api.post('/reports', {
      booking_id: selectedBookingForReport.id,
      title,
      description
    });
    
    toast({
      title: "Report submitted",
      description: "Your report has been received and will be reviewed by our team.",
      variant: "default"
    });
    
    setReportDialogOpen(false);
  } catch (error) {
    toast({
      title: "Report failed",
      description: error instanceof Error ? error.message : "Failed to submit report",
      variant: "destructive"
    });
  }
};

const handleConfirmBooking = async (bookingId: string, confirmed: boolean, disputeReason?: string) => {
    try {
        const response = await api.post(`/bookings/${bookingId}/confirm`, {
            confirmed,
            dispute_reason: disputeReason,
        });
        await fetchBookings();
        toast({
            title: confirmed ? "Booking Confirmed" : "Dispute Submitted",
            description: confirmed
                ? "The booking has been marked as completed."
                : "Your dispute has been submitted for review.",
            variant: "default",
        });
    } catch (error) {
        toast({
            title: "Action Failed",
            description: error instanceof Error ? error.message : "Failed to process your request.",
            variant: "destructive",
        });
    }
};

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
                <span className="text-lg font-bold">HomeHelp</span>
              </Link>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="px-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive>
                  <Link href="/dashboard/homeowner" className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/10">
                    <div className="p-1.5 rounded-md bg-white/10 group-hover:bg-white/20 transition-colors">
                      <HomeIcon className="h-4 w-4" />
                    </div>
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/homeowner/services" className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/10">
                    <div className="p-1.5 rounded-md bg-white/10 group-hover:bg-white/20 transition-colors">
                      <Search className="h-4 w-4" />
                    </div>
                    <span>Find Services</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/homeowner/bookings" className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/10">
                    <div className="p-1.5 rounded-md bg-white/10 group-hover:bg-white/20 transition-colors">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <span>My Bookings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/homeowner/messages" className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/10">
                    <div className="p-1.5 rounded-md bg-white/10 group-hover:bg-white/20 transition-colors">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <span>Messages</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
                              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/homeowner/settings" className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/10">
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
                    <AvatarFallback className="bg-indigo-600">JD</AvatarFallback>
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
                  <Link href="/dashboard/homeowner/settings" className="cursor-pointer">
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                    <span className="hidden md:inline text-sm font-medium">Homeowner</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/homeowner/settings" className="cursor-pointer">
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
              <h1 className="text-2xl font-bold text-gray-800">Welcome back, {userProfile.full_name}</h1>
              <p className="text-gray-600">Here's what's happening with your home services</p>
            </div>

            
            <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Bookings</CardTitle>
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                    <Calendar className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{stats.totalBookings}</div>
                      <p className="text-xs text-green-500 mt-1">+0 from last month</p>
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Active Bookings</CardTitle>
                  <div className="p-2 rounded-lg bg-green-100 text-green-600">
                    <Wrench className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{stats.activeBookings}</div>
                      <p className="text-xs text-green-500 mt-1">+0 from last month</p>
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Reviews Given</CardTitle>
                  <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                    <Star className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{stats.reviewsGiven}</div>
                      <p className="text-xs text-green-500 mt-1">+0 from last month</p>
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Messages</CardTitle>
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{stats.unreadMessages}</div>
                      <p className="text-xs text-green-500 mt-1">+0 new unread</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <Tabs defaultValue="upcoming" className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:grid-cols-3 gap-1 bg-gray-100 p-1 rounded-lg">
                  <TabsTrigger 
                    value="upcoming" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-1.5 text-sm font-medium transition-all"
                    onClick={() => setActiveTab("upcoming")}
                  >
                    Upcoming
                  </TabsTrigger>
                  <TabsTrigger 
                    value="past" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-1.5 text-sm font-medium transition-all"
                    onClick={() => setActiveTab("past")}
                  >
                    Past
                  </TabsTrigger>
                  <TabsTrigger 
                    value="services" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-1.5 text-sm font-medium transition-all"
                    onClick={() => setActiveTab("services")}
                  >
                    Available Services
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="upcoming" className="space-y-6">
                {isLoadingBookings ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : bookingError ? (
                  <div className="rounded-lg bg-red-50 p-4">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-5 w-5" />
                      <div>
                        <p className="font-medium">Error loading bookings</p>
                        <p className="text-sm">{bookingError}</p>
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
                ) : bookings.upcoming.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2">No upcoming bookings</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {bookings.upcoming.map((booking) => (
                      <Card key={booking.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                        <div className="relative h-40 w-full bg-gray-100 group">
                          <ServiceImage
                            src={booking.image || '/placeholder-service.jpg'}
                            alt={booking.serviceTitle}
                            className="group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                          <div className="absolute bottom-4 left-4 right-4">
                            <h3 className="text-lg font-bold text-white">
                              {booking.serviceTitle}
                            </h3>
                            <p className="text-sm text-white/90">
                              {booking.providerName}
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
                              {booking.price.toFixed(2)} Birr
                            </span>
                          </div>
                        </CardContent>
                        
                        <CardFooter className="flex justify-between gap-2 p-4 border-t">
    <Button 
        variant="outline" 
        size="sm" 
        className="flex-1"
        onClick={async () => {
            await api.post("/messages/initiate", { provider_id: booking.providerId });
            router.push(`/dashboard/homeowner/messages?contact=${booking.providerId}`);
        }}
    >
        Message
    </Button>
    {booking.status === 'awaiting_homeowner_confirmation' ? (
        <div className="flex gap-2">
            <Button 
                variant="default" 
                size="sm"
                onClick={() => handleConfirmBooking(booking.id, true)}
            >
                Confirm
            </Button>
            <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                    setSelectedBookingForDispute(booking);
                    setDisputeDialogOpen(true);
                }}
            >
                Dispute
            </Button>
        </div>
    ) : booking.status === 'completed' && !booking.rating ? (
        <RatingDialog
            bookingId={booking.id}
            serviceTitle={booking.serviceTitle}
            providerName={booking.providerName}
            onRatingSubmitAction={handleRateService}
        />
    ) : null}
</CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="past" className="space-y-6">
                {isLoadingBookings ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : bookingError ? (
                  <div className="rounded-lg bg-red-50 p-4">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-5 w-5" />
                      <div>
                        <p className="font-medium">Error loading bookings</p>
                        <p className="text-sm">{bookingError}</p>
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
                ) : bookings.past.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2">No past bookings</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {bookings.past.map((booking) => (
                      <Card key={booking.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                        <div className="relative h-40 w-full bg-gray-100 group">
                          <ServiceImage
                            src={booking.image || '/placeholder-service.jpg'}
                            alt={booking.serviceTitle}
                            className="group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                          <div className="absolute bottom-4 left-4 right-4">
                            <h3 className="text-lg font-bold text-white">
                              {booking.serviceTitle}
                            </h3>
                            <p className="text-sm text-white/90">
                              {booking.providerName}
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
                              {booking.price.toFixed(2)} Birr
                            </span>
                          </div>
              
                          {/* Rating Section */}
                          {booking.status === 'completed' && (
                            <div className="mt-4 pt-4 border-t">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-gray-700">Your Review:</p>
                                {!booking.review ? (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedBookingForReview(booking);
                                      setReviewDialogOpen(true);
                                    }}
                                  >
                                    Add Review
                                  </Button>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-4 w-4 ${booking.review && star <= booking.review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                              {booking.review?.review_text && (
                                <p className="text-sm text-gray-600 mt-2">
                                  {booking.review.review_text}
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                        
                        <CardFooter className="flex justify-between gap-2 p-4 border-t">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={async () => {
                              // First initialize the conversation
                              await api.post("/messages/initiate", { provider_id: booking.providerId});
                              // Then navigate to messages
                              router.push(`/dashboard/homeowner/messages?contact=${booking.providerId}`);
                            }}
                          >
                            Message
                          </Button>

                          {!booking.review && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-2 w-full"
                              onClick={() => {
                                setSelectedBookingForReport(booking);
                                setReportDialogOpen(true);
                              }}
                            >
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Report Issue
                            </Button>  
                          )}
                        
                        </CardFooter>
                      </Card>
                    ))}

                  </div>
                )}
              </TabsContent>

              <TabsContent value="services" className="space-y-6">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : error ? (
                  <div className="rounded-lg bg-red-50 p-4">
                    <p className="text-red-600">Error loading services: {error}</p>
                  </div>
                ) : (
                  <>
                    {filteredServices.length === 0 ? (
                      <div className="text-center py-12">
                        <Search className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-gray-500">No services found</p>
                        <Button 
                          variant="ghost" 
                          className="mt-2"
                          onClick={() => setSearchTerm("")}
                        >
                          Clear search
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredServices.map((service) => (
                          <Card key={service.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                            <div className="relative h-40 w-full bg-gray-100 group">
                              <ServiceImage
                                src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${service.image}` || '/placeholder-service.jpg'}
                                alt={service.title}
                                className="group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                              <div className="absolute bottom-4 left-4 right-4">
                                <h3 className="text-lg font-bold text-white">{service.title}</h3>
                                <p className="text-sm text-white/90">{service.provider_name || "Professional Service"}</p>
                              </div>
                            </div>
                            
                            <CardContent className="p-4">
                              <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                                {service.description}
                              </p>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span className="text-sm font-medium">
                                    {(service.rating ?? 0).toFixed(1)}
                                  </span>
                                </div>
                                <span className="text-lg font-bold text-indigo-600">
                                  {service.price.toFixed(2)} Birr
                                </span>
                              </div>
                            </CardContent>
                            
                            <CardFooter className="flex justify-between gap-2 p-4 border-t">
                             <ServiceDetailsDialog 
                              service={{ 
                                id: service.id.toString(),
                                title: service.title,
                                description: service.description,
                                price: `${service.price.toFixed(2)} Birr`,
                                image: `${process.env.NEXT_PUBLIC_API_BASE_URL}${service.image}` || "/placeholder-service.jpg",
                                provider_name: service.provider_name || "Professional Service",
                                rating: service.rating ?? 0,
                                reviews: service.reviews || []
                              }} 
                            />
                              <BookingDialog 
                                serviceId={service.id.toString()} 
                                serviceTitle={service.title}
                                providerName={service.provider_name || "Professional Service"}
                                homeownerName={user?.email?.split('@')[0] || "Homeowner"}
                                onBookingSuccess={handleCreateBooking}
                              />
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
      
      {selectedBookingForReview && (
      <ReviewDialog
        bookingId={selectedBookingForReview.id}
        serviceTitle={selectedBookingForReview.serviceTitle}
        providerName={selectedBookingForReview.providerName}
        isOpen={reviewDialogOpen}
        onOpenChangeAction={setReviewDialogOpen}
        onReviewSubmitAction={handleReviewSubmit}
        existingRating={selectedBookingForReview.review?.rating}
        existingReview={selectedBookingForReview.review?.review_text}
      />
    )}

    {selectedBookingForReport && (
  <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Report Booking</DialogTitle>
        <DialogDescription>
          Please provide details about your issue with this booking.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="report-title">Title</Label>
          <Input 
            id="report-title" 
            placeholder="Brief title for your report" 
          />
        </div>
        <div>
          <Label htmlFor="report-description">Description</Label>
          <Textarea
            id="report-description"
            placeholder="Please describe the issue in detail..."
            rows={5}
          />
        </div>
      </div>
      <DialogFooter>
        <Button 
          variant="outline" 
          onClick={() => setReportDialogOpen(false)}
        >
          Cancel
        </Button>
        <Button 
          onClick={() => {
            const title = (document.getElementById('report-title') as HTMLInputElement).value;
            const description = (document.getElementById('report-description') as HTMLTextAreaElement).value;
            handleReportSubmit(title, description);
          }}
        >
          Submit Report
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)}


<Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Dispute Booking Completion</DialogTitle>
            <DialogDescription>
                Please provide a reason for disputing the service completion.
            </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
            <div>
                <Label htmlFor="dispute-reason">Reason for Dispute</Label>
                <Textarea
                    id="dispute-reason"
                    placeholder="Describe the issue with the service..."
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    rows={5}
                />
            </div>
        </div>
        <DialogFooter>
            <Button 
                variant="outline" 
                onClick={() => {
                    setDisputeDialogOpen(false);
                    setDisputeReason("");
                }}
            >
                Cancel
            </Button>
            <Button 
                onClick={() => {
                    if (selectedBookingForDispute && disputeReason.trim()) {
                        handleConfirmBooking(selectedBookingForDispute.id, false, disputeReason);
                        setDisputeDialogOpen(false);
                        setDisputeReason("");
                    } else {
                        toast({
                            title: "Error",
                            description: "Please provide a dispute reason.",
                            variant: "destructive",
                        });
                    }
                }}
            >
                Submit Dispute
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>
    </SidebarProvider>

  )
}
