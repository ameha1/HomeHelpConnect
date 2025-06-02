"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, AlertCircle, Search, Star } from "lucide-react"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { BookingStatusBadge } from "@/components/booking-status-badge"
import { ReceiptDialog } from "@/components/receipt-dialog"
import { BookingDialog } from "@/components/booking-dialog"
import { ServiceDetailsDialog } from "@/components/service-details-dialog"
import { getBookings, cancelBooking, getServices } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "../../../../app/context/auth-context"
import api from "@/lib/api"
import { useRouter } from "next/navigation"
import { ReviewDialog } from "@/components/review-dialogue"

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

interface Service {
  id: number
  title: string
  description: string
  price: number
  image?: string
  provider_name?: string
  rating?: number
}

export default function BookingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isLoadingBookings, setIsLoadingBookings] = useState(true)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [bookings, setBookings] = useState<{ upcoming: Booking[]; past: Booking[] }>({ upcoming: [], past: [] })
  const [recommendedServices, setRecommendedServices] = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [serviceError, setServiceError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("upcoming")
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null)
  const [selectedBookingForReport, setSelectedBookingForReport] = useState<Booking | null>(null)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)

  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoadingBookings(true)
      setBookingError(null)
      
      try {
        const response = await getBookings()
        
        const transformBooking = (booking: any) => ({
          id: booking.id.toString(),
          service_id: booking.service_id?.toString() || '',
          homeowner_id: booking.homeowner_id?.toString() || '',
          serviceTitle: booking.service_title || booking.serviceTitle || 
                       (booking.service?.title || 'Service'),
          providerName: booking.provider_name || booking.providerName || 
                       (booking.service?.provider?.user?.full_name || 'Provider'),
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
          rating: booking.rating
        })
        
        setBookings({
          upcoming: response.upcoming.map(transformBooking),
          past: response.past.map(transformBooking)
        })
      } catch (error) {
        console.error('Error loading bookings:', error)
        setBookingError(
          error instanceof Error 
            ? error.message 
            : 'Failed to load bookings. Please try again later.'
        )
      } finally {
        setIsLoadingBookings(false)
      }
    }
    
    fetchBookings()
  }, [])

  useEffect(() => {
    const fetchRecommendedServices = async () => {
      setLoadingServices(true)
      setServiceError(null)
      
      try {
        const data = await getServices()
        setRecommendedServices(data)
      } catch (error) {
        console.error('Error loading services:', error)
        setServiceError(
          error instanceof Error 
            ? error.message 
            : 'Failed to load recommended services.'
        )
      } finally {
        setLoadingServices(false)
      }
    }
    
    fetchRecommendedServices()
  }, [])

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await cancelBooking(bookingId)
      setBookings(prev => ({
        upcoming: prev.upcoming.filter(b => b.id !== bookingId),
        past: [...prev.past, {
          ...prev.upcoming.find(b => b.id === bookingId)!,
          status: 'cancelled',
          updated_at: new Date().toISOString()
        }]
      }))
      toast({ title: "Booking canceled successfully", variant: "default" })
    } catch (err) {
      console.error('Cancel booking error:', err)
      toast({ 
        title: "Failed to cancel booking", 
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive" 
      })
    }
  }

  const handleReviewSubmit = async (bookingId: string, rating: number, reviewText: string) => {
    try {
      const response = await api.post(`/bookings/${bookingId}/reviews`, {
        rating,
        review_text: reviewText
      })
      
      setBookings(prev => ({
        upcoming: prev.upcoming,
        past: prev.past.map(booking => 
          booking.id === bookingId 
            ? { ...booking, review: response.data } 
            : booking
        )
      }))
      
      if (selectedBookingForReview) {
        setRecommendedServices(prev => 
          prev.map(service => 
            service.id.toString() === selectedBookingForReview.service_id
              ? { ...service, rating: response.data.rating }
              : service
          )
        )
      }
      toast({ title: "Review submitted successfully", variant: "default" })
    } catch (error) {
      console.error('Review submission error:', error)
      throw error
    }
  }

  const filteredBookings = {
    upcoming: bookings.upcoming.filter(booking =>
      booking.serviceTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      format(new Date(booking.scheduled_date), "MMMM d, yyyy").toLowerCase().includes(searchTerm.toLowerCase())
    ),
    past: bookings.past.filter(booking =>
      booking.serviceTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      format(new Date(booking.scheduled_date), "MMMM d, yyyy").toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-teal-50 to-coral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">
            My Bookings
          </h1>
          
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-500" />
            </div>
            <Input
              type="search"
              placeholder="Search by service, provider, or date..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-gray-700 placeholder-gray-400 transition-all duration-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-2 gap-2 bg-transparent p-0">
            <TabsTrigger 
              value="upcoming" 
              className="relative py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 bg-white/50 backdrop-blur-sm shadow-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-gray-100"
              onClick={() => setActiveTab("upcoming")}
            >
              Upcoming
              {filteredBookings.upcoming.length > 0 && (
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-teal-100 text-teal-800">
                  {filteredBookings.upcoming.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="past" 
              className="relative py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 bg-white/50 backdrop-blur-sm shadow-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-gray-100"
              onClick={() => setActiveTab("past")}
            >
              Past
              {filteredBookings.past.length > 0 && (
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-coral-100 text-coral-800">
                  {filteredBookings.past.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-6 animate-fade-in">
            {isLoadingBookings ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
              </div>
            ) : bookingError ? (
              <div className="rounded-xl bg-red-50 p-6 shadow-sm">
                <div className="flex items-center gap-3 text-red-600">
                  <AlertCircle className="h-6 w-6" />
                  <div>
                    <p className="font-medium text-lg">Error loading bookings</p>
                    <p className="text-sm">{bookingError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3 border-red-300 text-red-600 hover:bg-red-100"
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              </div>
            ) : filteredBookings.upcoming.length === 0 ? (
              <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-xl shadow-sm">
                <Calendar className="mx-auto h-12 w-12 text-teal-400" />
                <p className="mt-3 text-lg font-medium text-gray-700">
                  {searchTerm ? "No upcoming bookings match your search" : "No upcoming bookings"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchTerm ? "Try adjusting your search terms." : "Book a new service to get started!"}
                </p>
                {searchTerm && (
                  <Button 
                    variant="ghost" 
                    className="mt-4 text-teal-600 hover:bg-teal-100"
                    onClick={() => setSearchTerm("")}
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredBookings.upcoming.map((booking) => (
                  <Card key={booking.id} className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden border border-gray-100 animate-slide-up">
                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-teal-50">
                      <CardTitle className="text-xl font-semibold text-gray-800">{booking.serviceTitle}</CardTitle>
                      <p className="text-sm text-gray-600">{booking.providerName}</p>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-5 w-5 text-teal-500" />
                        <span className="text-sm text-gray-700">
                          {format(new Date(booking.scheduled_date), "MMMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <Clock className="h-5 w-5 text-teal-500" />
                        <span className="text-sm text-gray-700">{booking.scheduled_time}</span>
                      </div>
                      
                      <div className="flex justify-between items-center mb-4">
                        <BookingStatusBadge status={booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled'} />
                        <span className="text-lg font-bold text-teal-600">
                          ${booking.price.toFixed(2)}
                        </span>
                      </div>
                      
                      {booking.notes && (
                        <p className="text-sm text-gray-600 mt-3 line-clamp-2 bg-gray-50 p-3 rounded-lg">
                          <span className="font-medium">Notes:</span> {booking.notes}
                        </p>
                      )}
                    </CardContent>
                    <CardFooter className="flex flex-wrap justify-between gap-2 p-4 bg-gray-50">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 border-teal-300 text-teal-600 hover:bg-teal-100"
                        asChild
                      >
                        <Link href={`/dashboard/homeowner/messages?contact=${parseInt(booking.providerId)}`}>
                          Message
                        </Link>
                      </Button>
                      {booking.status === 'confirmed' && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="flex-1 bg-gradient-to-r from-coral-500 to-red-500 hover:from-coral-600 hover:to-red-600"
                          onClick={() => handleCancelBooking(booking.id)}
                        >
                          Cancel
                        </Button>
                      )}
                      <ReceiptDialog
                        bookingId={booking.id}
                        serviceTitle={booking.serviceTitle}
                        provider={booking.providerName}
                        date={`${format(new Date(booking.scheduled_date), "MMMM d, yyyy")} at ${booking.scheduled_time}`}
                        price={`$${booking.price.toFixed(2)}`}
                      />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-6 animate-fade-in">
            {isLoadingBookings ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
              </div>
            ) : bookingError ? (
              <div className="rounded-xl bg-red-50 p-6 shadow-sm">
                <div className="flex items-center gap-3 text-red-600">
                  <AlertCircle className="h-6 w-6" />
                  <div>
                    <p className="font-medium text-lg">Error loading bookings</p>
                    <p className="text-sm">{bookingError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3 border-red-300 text-red-600 hover:bg-red-100"
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              </div>
            ) : filteredBookings.past.length === 0 ? (
              <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-xl shadow-sm">
                <Calendar className="mx-auto h-12 w-12 text-teal-400" />
                <p className="mt-3 text-lg font-medium text-gray-700">
                  {searchTerm ? "No past bookings match your search" : "No past bookings"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchTerm ? "Try adjusting your search terms." : "Your completed or canceled bookings will appear here."}
                </p>
                {searchTerm && (
                  <Button 
                    variant="ghost" 
                    className="mt-4 text-teal-600 hover:bg-teal-100"
                    onClick={() => setSearchTerm("")}
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredBookings.past.map((booking) => (
                  <Card key={booking.id} className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden border border-gray-100 animate-slide-up">
                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-teal-50">
                      <CardTitle className="text-xl font-semibold text-gray-800">{booking.serviceTitle}</CardTitle>
                      <p className="text-sm text-gray-600">{booking.providerName}</p>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-5 w-5 text-teal-500" />
                        <span className="text-sm text-gray-700">
                          {format(new Date(booking.scheduled_date), "MMMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <Clock className="h-5 w-5 text-teal-500" />
                        <span className="text-sm text-gray-700">{booking.scheduled_time}</span>
                      </div>
                      
                      <div className="flex justify-between items-center mb-4">
                        <BookingStatusBadge status={booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled'} />
                        <span className="text-lg font-bold text-teal-600">
                          ${booking.price.toFixed(2)}
                        </span>
                      </div>
                      
                      {booking.status === 'completed' && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-700">Your Review:</p>
                            {!booking.review ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="border-teal-300 text-teal-600 hover:bg-teal-100"
                                onClick={() => {
                                  setSelectedBookingForReview(booking)
                                  setReviewDialogOpen(true)
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
                            <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded-lg">
                              {booking.review.review_text}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                    
                    <CardFooter className="flex flex-wrap justify-between gap-2 p-4 bg-gray-50">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 border-teal-300 text-teal-600 hover:bg-teal-100"
                        onClick={async () => {
                          await api.post("/messages/initiate", { provider_id: booking.providerId })
                          router.push(`/dashboard/homeowner/messages?contact=${booking.providerId}`)
                        }}
                      >
                        Message
                      </Button>
                      {!booking.review && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 border-coral-300 text-coral-600 hover:bg-coral-100"
                          onClick={() => {
                            setSelectedBookingForReport(booking)
                            setReportDialogOpen(true)
                          }}
                        >
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Report Issue
                        </Button>  
                      )}
                      <ReceiptDialog
                        bookingId={booking.id}
                        serviceTitle={booking.serviceTitle}
                        provider={booking.providerName}
                        date={`${format(new Date(booking.scheduled_date), "MMMM d, yyyy")} at ${booking.scheduled_time}`}
                        price={`$${booking.price.toFixed(2)}`}
                      />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
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
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        .animate-slide-up {
          animation: slideUp 0.5s ease-out;
        }
      `}</style>
    </div>
  )
}
