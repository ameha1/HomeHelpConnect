"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { HomeIcon, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

// Mock data
const homeowners = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@example.com",
    date: "Joined 6 months ago",
    bookings: 8,
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    date: "Joined 1 year ago",
    bookings: 12,
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: "3",
    name: "Michael Chen",
    email: "michael.chen@example.com",
    date: "Joined 3 months ago",
    bookings: 5,
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: "4",
    name: "Emily Rodriguez",
    email: "emily.rodriguez@example.com",
    date: "Joined 2 years ago",
    bookings: 24,
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: "5",
    name: "David Wilson",
    email: "david.wilson@example.com",
    date: "Joined 8 months ago",
    bookings: 10,
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: "6",
    name: "Jennifer Lee",
    email: "jennifer.lee@example.com",
    date: "Joined 4 months ago",
    bookings: 7,
    image: "/placeholder.svg?height=100&width=100",
  },
]

export default function AdminHomeownersPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Homeowners</h1>
          <p className="text-muted-foreground">Manage homeowner accounts on the platform</p>
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
          <Input type="search" placeholder="Search homeowners..." className="pl-10 py-6 text-lg" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {homeowners.map((homeowner) => (
          <Card key={homeowner.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>{homeowner.name}</CardTitle>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                  Active
                </Badge>
              </div>
              <CardDescription>{homeowner.email}</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex items-center gap-4">
                <img
                  src={homeowner.image || "/placeholder.svg"}
                  alt={homeowner.name}
                  className="h-16 w-16 rounded-md object-cover"
                />
                <div>
                  <p className="text-xs text-muted-foreground">{homeowner.date}</p>
                  <p className="text-sm font-medium">{homeowner.bookings} Bookings</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/admin/homeowners/${homeowner.id}`}>View Details</Link>
              </Button>
              <Button variant="destructive" size="sm">
                Suspend
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}

