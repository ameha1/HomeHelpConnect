"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HomeIcon, Search, Star, Calendar, MessageSquare, Settings, LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
import { RatingDialog } from "@/components/rating-dialog"
import { BookingDialog } from "@/components/booking-dialog"
import { ServiceDetailsDialog } from "@/components/service-details-dialog"

export default function HomeownerDashboard() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar className="bg-gray-900  text-white" >
          <SidebarHeader className="border-b">
            <div className="flex items-center gap-2 px-4 py-2">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <HomeIcon className="h-6 w-6 text-homehelp-600" />
                <span className="text-lg font-bold">HomeHelp</span>
              </Link>
            </div>
          </SidebarHeader>
          <SidebarContent   className="bg-gray-900  text-white" >
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive>
                  <Link href="/dashboard/homeowner">
                    <HomeIcon className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/homeowner/services">
                    <Search className="h-4 w-4" />
                    <span>Find Services</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/homeowner/bookings">
                    <Calendar className="h-4 w-4" />
                    <span>My Bookings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/homeowner/messages">
                    <MessageSquare className="h-4 w-4" />
                    <span>Messages</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/homeowner/settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar>
                  <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">John Doe</p>
                  <p className="text-xs text-muted-foreground">john.doe@example.com</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">User menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/homeowner/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/login">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarFooter>
        </Sidebar>















        <div className="flex-1  ">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <form className="hidden md:block">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search services..."
                    className="w-64 rounded-full bg-background pl-8 md:w-80"
                  />
                </div>
              </form>
              <NotificationsPanel />
            </div>
          </header>
          <main className="grid flex-1 items-start gap-4 p-4 md:gap-8 md:p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">+2 from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground">+1 from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reviews Given</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8</div>
                  <p className="text-xs text-muted-foreground">+3 from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Messages</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">5</div>
                  <p className="text-xs text-muted-foreground">+2 new unread</p>
                </CardContent>
              </Card>
            </div>
            <Tabs defaultValue="upcoming" className="space-y-4">
              <TabsList>
                <TabsTrigger value="upcoming">Upcoming Services</TabsTrigger>
                <TabsTrigger value="past">Past Services</TabsTrigger>
                <TabsTrigger value="recommended">Recommended</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    {
                      id: "1",
                      title: "Plumbing Repair",
                      provider: "Mike's Plumbing",
                      date: "Tomorrow, 10:00 AM",
                      status: "Confirmed",
                      image: "/placeholder.svg?height=100&width=100",
                    },
                    {
                      id: "2",
                      title: "House Cleaning",
                      provider: "CleanPro Services",
                      date: "Friday, 2:00 PM",
                      status: "Pending",
                      image: "/placeholder.svg?height=100&width=100",
                    },
                    {
                      id: "3",
                      title: "Electrical Inspection",
                      provider: "Volt Experts",
                      date: "Next Monday, 9:00 AM",
                      status: "Confirmed",
                      image: "/placeholder.svg?height=100&width=100",
                    },
                  ].map((booking, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle>{booking.title}</CardTitle>
                          <Badge variant={booking.status === "Confirmed" ? "default" : "outline"}>
                            {booking.status}
                          </Badge>
                        </div>
                        <CardDescription>{booking.provider}</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex items-center gap-4">
                          <img
                            src={booking.image || "/placeholder.svg"}
                            alt={booking.provider}
                            className="h-16 w-16 rounded-md object-cover"
                          />
                          <div>
                            <p className="text-sm font-medium">{booking.date}</p>
                            <div className="mt-1 flex items-center">
                              <Star className="mr-1 h-3 w-3 fill-primary text-primary" />
                              <Star className="mr-1 h-3 w-3 fill-primary text-primary" />
                              <Star className="mr-1 h-3 w-3 fill-primary text-primary" />
                              <Star className="mr-1 h-3 w-3 fill-primary text-primary" />
                              <Star className="h-3 w-3 text-muted-foreground" />
                              <span className="ml-1 text-xs text-muted-foreground">4.0</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="outline" size="sm" asChild>
                          <Link href="/dashboard/homeowner/messages">Message</Link>
                        </Button>
                        <ServiceDetailsDialog
                          service={{
                            id: booking.id,
                            title: booking.title,
                            provider_name: booking.provider,
                            price: "$150",
                            rating: 4.0,
                            image: booking.image,
                          }}
                        />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="past" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    {
                      id: "4",
                      title: "Lawn Mowing",
                      provider: "Green Thumb Landscaping",
                      date: "Last week",
                      status: "Completed",
                      image: "/placeholder.svg?height=100&width=100",
                    },
                    {
                      id: "5",
                      title: "AC Repair",
                      provider: "Cool Air Services",
                      date: "2 weeks ago",
                      status: "Completed",
                      image: "/placeholder.svg?height=100&width=100",
                    },
                    {
                      id: "6",
                      title: "Painting Service",
                      provider: "Perfect Painters",
                      date: "Last month",
                      status: "Completed",
                      image: "/placeholder.svg?height=100&width=100",
                    },
                  ].map((booking, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle>{booking.title}</CardTitle>
                          <Badge variant="secondary">{booking.status}</Badge>
                        </div>
                        <CardDescription>{booking.provider}</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex items-center gap-4">
                          <img
                            src={booking.image || "/placeholder.svg"}
                            alt={booking.provider}
                            className="h-16 w-16 rounded-md object-cover"
                          />
                          <div>
                            <p className="text-sm font-medium">{booking.date}</p>
                            <div className="mt-1 flex items-center">
                              <Star className="mr-1 h-3 w-3 fill-primary text-primary" />
                              <Star className="mr-1 h-3 w-3 fill-primary text-primary" />
                              <Star className="mr-1 h-3 w-3 fill-primary text-primary" />
                              <Star className="mr-1 h-3 w-3 fill-primary text-primary" />
                              <Star className="mr-1 h-3 w-3 fill-primary text-primary" />
                              <span className="ml-1 text-xs text-muted-foreground">5.0</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="outline" size="sm">
                          Book Again
                        </Button>
                        <RatingDialog bookingId={booking.id} serviceTitle={booking.title} />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="recommended" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    {
                      id: "7",
                      title: "Home Cleaning",
                      provider: "Sparkle Cleaning",
                      price: "$120",
                      rating: 4.8,
                      image: "/placeholder.svg?height=100&width=100",
                    },
                    {
                      id: "8",
                      title: "Gardening Service",
                      provider: "Garden Masters",
                      price: "$85",
                      rating: 4.7,
                      image: "/placeholder.svg?height=100&width=100",
                    },
                    {
                      id: "9",
                      title: "Handyman Services",
                      provider: "Fix-It-All",
                      price: "$95/hour",
                      rating: 4.9,
                      image: "/placeholder.svg?height=100&width=100",
                    },
                  ].map((service, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <CardTitle>{service.title}</CardTitle>
                        <CardDescription>{service.provider}</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex items-center gap-4">
                          <img
                            src={service.image || "/placeholder.svg"}
                            alt={service.provider}
                            className="h-16 w-16 rounded-md object-cover"
                          />
                          <div>
                            <p className="text-sm font-medium">{service.price}</p>
                            <div className="mt-1 flex items-center">
                              <Star className="mr-1 h-3 w-3 fill-primary text-primary" />
                              <Star className="mr-1 h-3 w-3 fill-primary text-primary" />
                              <Star className="mr-1 h-3 w-3 fill-primary text-primary" />
                              <Star className="mr-1 h-3 w-3 fill-primary text-primary" />
                              <Star className="mr-1 h-3 w-3 fill-primary text-primary" />
                              <span className="ml-1 text-xs text-muted-foreground">{service.rating}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <ServiceDetailsDialog service={{ ...service, provider_name: service.provider }} />
                        <BookingDialog serviceId={service.id} serviceTitle={service.title} />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </main>
        </div>







      </div>
    </SidebarProvider>
  )
}

