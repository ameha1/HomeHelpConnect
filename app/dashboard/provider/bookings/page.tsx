"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HomeIcon, CheckCircle, XCircle, Loader2, MessageSquare, FileText, Calendar, Wrench, Users, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useState } from "react"
import { format } from "date-fns"
import { BookingStatusBadge } from "@/components/booking-status-badge"
import api from '@/lib/api'
import { useAuth } from '../../../../app/context/auth-context'

interface Booking {
  id: string;
  serviceTitle: string;
  clientName: string;
  address: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
  image?: string;
  clientId?: string;
}

async function getBookingsByProvider(): Promise<{ upcoming: any[], past: any[] }> {
  try {
    const response = await api.get('/bookings/provider')
    return {
      upcoming: Array.isArray(response.data.upcoming) ? response.data.upcoming : [],
      past: Array.isArray(response.data.past) ? response.data.past : []
    }
  } catch (error) {
    console.error("Error fetching bookings:", error)
    return { upcoming: [], past: [] }
  }
}

async function updateBookingStatus(bookingId: string, newStatus: string): Promise<void> {
  try {
    const response = await api.patch(`/bookings/${bookingId}/status`, { status: newStatus })
    if (!response || response.status !== 200) {
      throw new Error("Failed to update booking status")
    }
  } catch (error) {
    console.error("Error updating booking status:", error)
    throw error
  }
}

export default function ProviderBookingsPage() {
  const { toast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const userEmail = user?.email || ''

  // Fetch provider bookings
  const fetchProviderBookings = async () => {
    setIsLoading(true)
    try {
      const { upcoming, past } = await getBookingsByProvider()
      
      const allBookings = [...upcoming, ...past]
      
      const transformedData = allBookings.map((booking: any) => ({
        id: booking.id,
        serviceTitle: booking.service_title || booking.service?.title || 'Unknown Service',
        clientName: booking.homeowner_name || 'Unknown Client',
        address: booking.address || 'Address not specified',
        date: booking.scheduled_date || booking.date,
        time: booking.scheduled_time || 'Time not specified',
        status: booking.status,
        price: booking.price || 0,
        image: booking.service?.image || '/placeholder-service.jpg',
        clientId: booking.homeowner_id?.toString(),
      }))
      
      setBookings(transformedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings')
      console.error("Error fetching bookings:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProviderBookings()
  }, [])

  // Handle booking status changes
  const handleStatusChange = async (bookingId: string, newStatus: 'confirmed' | 'cancelled' | 'completed') => {
    try {
      setIsLoading(true)
      await updateBookingStatus(bookingId, newStatus)
      await fetchProviderBookings() // Refresh bookings after update
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
      setIsLoading(false)
    }
  }

  // Separate bookings by status
  const upcomingBookings = bookings.filter(booking => 
    booking.status === 'confirmed' && 
    new Date(format(new Date(`${booking.date} ${booking.time}`), "yyyy-MM-dd'T'HH:mm:ss")) > new Date()
  )

  const pendingBookings = bookings.filter(booking => 
    booking.status === 'pending'
  )

  const completedBookings = bookings.filter(booking => 
    booking.status === 'completed' 
    // (booking.status === 'confirmed' && new Date(`${booking.date}T${booking.time}`) <= new Date())
  )

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bookings</h1>
          <p className="text-muted-foreground">Manage your service bookings</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/provider">
            <HomeIcon className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Upcoming Jobs</CardTitle>
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingBookings.length}</div>
            <p className="text-xs text-green-500 mt-1">
              {upcomingBookings.length > 0 ? 
              `${upcomingBookings.length} scheduled` : 'No upcoming jobs'}
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
            <div className="text-2xl font-bold">{pendingBookings.length}</div>
            <p className="text-xs text-green-500 mt-1">
              {pendingBookings.length > 0 ? 
              `${pendingBookings.length} to review` : 'No pending requests'}
            </p>
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
            <div className="text-2xl font-bold">{completedBookings.length}</div>
            <p className="text-xs text-green-500 mt-1">
              {completedBookings.length > 0 ? 
              `+${completedBookings.length} this month` : 'No completed jobs yet'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Earnings</CardTitle>
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${completedBookings.reduce((sum, booking) => sum + booking.price, 0).toFixed(2)}
            </div>
            <p className="text-xs text-green-500 mt-1">From completed jobs</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedBookings.length})
          </TabsTrigger>
        </TabsList>

        {/* Upcoming Bookings Tab */}
        <TabsContent value="upcoming" className="space-y-6">
          {upcomingBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="p-4 bg-blue-100 rounded-full">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No upcoming bookings</h3>
              <p className="text-gray-500 max-w-md">
                You don't have any scheduled jobs coming up. Check back later or promote your services to get more bookings.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-lg transition-shadow overflow-hidden group">
                  <div className="relative h-40 w-full bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-lg font-bold text-gray-900">{booking.serviceTitle}</h3>
                      <p className="text-sm text-gray-600">{booking.clientName}</p>
                    </div>
                  </div>
                  
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700">
                        {new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-700">{booking.time}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <HomeIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700 line-clamp-1">{booking.address}</span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
<div className="flex items-center gap-1">
  <DollarSign className="h-4 w-4 text-gray-400" />
  <span className="font-medium text-gray-900">${booking.price.toFixed(2)}</span>
</div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                          onClick={() => handleStatusChange(booking.id, 'completed')}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Complete"
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleStatusChange(booking.id, 'cancelled')}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Cancel"
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pending Bookings Tab */}
        <TabsContent value="pending" className="space-y-6">
          {pendingBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="p-4 bg-yellow-100 rounded-full">
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No pending requests</h3>
              <p className="text-gray-500 max-w-md">
                You don't have any pending booking requests. All caught up!
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pendingBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-lg transition-shadow overflow-hidden group border-l-4 border-yellow-400">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{booking.serviceTitle}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Request from {booking.clientName}
                        </p>
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
  <DollarSign className="h-4 w-4 text-gray-400" />
  <span className="font-medium">${booking.price.toFixed(2)}</span>
</div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleStatusChange(booking.id, 'confirmed')}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Accept"
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleStatusChange(booking.id, 'cancelled')}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Decline"
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Completed Bookings Tab */}
        <TabsContent value="completed" className="space-y-6">
          {completedBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="p-4 bg-green-100 rounded-full">
                <Wrench className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No completed jobs yet</h3>
              <p className="text-gray-500 max-w-md">
                Your completed jobs will appear here once you start accepting bookings.
              </p>
            </div>
          ) : (
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
  <DollarSign className="h-4 w-4 text-gray-400" />
  <span className="font-medium text-gray-900">${booking.price.toFixed(2)}</span>
</div>
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}