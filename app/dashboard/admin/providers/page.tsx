"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HomeIcon, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ProviderApprovalCard } from "@/components/admin-components"
import type { Provider } from "@/lib/types"
import { ProviderDetailsDialog } from "@/components/provider-details-dialog"

// Mock data
const pendingProviders: Provider[] = [
  {
    id: "1",
    name: "Michael Chen",
    type: "Electrician",
    experience: "5+ years",
    date: "Applied 2 days ago",
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: "2",
    name: "Sarah Johnson",
    type: "Plumber",
    experience: "3+ years",
    date: "Applied 3 days ago",
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: "3",
    name: "David Wilson",
    type: "Carpenter",
    experience: "7+ years",
    date: "Applied 1 day ago",
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: "4",
    name: "Emily Rodriguez",
    type: "Painter",
    experience: "4+ years",
    date: "Applied 4 days ago",
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: "5",
    name: "Robert Brown",
    type: "HVAC Technician",
    experience: "6+ years",
    date: "Applied 2 days ago",
    image: "/placeholder.svg?height=100&width=100",
  },
]

const approvedProviders = [
  {
    id: "6",
    name: "Mike's Plumbing",
    type: "Plumbing",
    experience: "10+ years",
    date: "Joined 6 months ago",
    rating: 4.8,
    bookings: 124,
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: "7",
    name: "Volt Experts",
    type: "Electrical",
    experience: "8+ years",
    date: "Joined 1 year ago",
    rating: 4.7,
    bookings: 98,
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: "8",
    name: "CleanPro Services",
    type: "Cleaning",
    experience: "5+ years",
    date: "Joined 3 months ago",
    rating: 4.9,
    bookings: 87,
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: "9",
    name: "Green Thumb Landscaping",
    type: "Landscaping",
    experience: "12+ years",
    date: "Joined 2 years ago",
    rating: 4.6,
    bookings: 156,
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: "10",
    name: "Perfect Painters",
    type: "Painting",
    experience: "7+ years",
    date: "Joined 8 months ago",
    rating: 4.5,
    bookings: 76,
    image: "/placeholder.svg?height=100&width=100",
  },
]

export default function AdminProvidersPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Service Providers</h1>
          <p className="text-muted-foreground">Manage service providers on the platform</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/admin">
            <HomeIcon className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input type="search" placeholder="Search providers..." className="pl-10 py-6 text-lg" />
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">Pending Approval ({pendingProviders.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved Providers ({approvedProviders.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pendingProviders.map((provider) => (
              <ProviderApprovalCard key={provider.id} provider={provider} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="approved" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {approvedProviders.map((provider) => (
              <Card key={provider.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle>{provider.name}</CardTitle>
                    <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                      Active
                    </Badge>
                  </div>
                  <CardDescription>{provider.type}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center gap-4">
                    <img
                      src={provider.image || "/placeholder.svg"}
                      alt={provider.name}
                      className="h-16 w-16 rounded-md object-cover"
                    />
                    <div>
                      <p className="text-sm">{provider.experience}</p>
                      <p className="text-xs text-muted-foreground">{provider.date}</p>
                      <div className="mt-1 flex items-center">
                        <span className="text-sm font-medium">Rating: {provider.rating}</span>
                        <span className="mx-2">•</span>
                        <span className="text-sm font-medium">{provider.bookings} Bookings</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <ProviderDetailsDialog provider={provider} />
                  <Button variant="destructive" size="sm">
                    Suspend
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

