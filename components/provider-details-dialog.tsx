"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Star, Calendar, DollarSign, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface ProviderDetailsDialogProps {
  provider: {
    id: string
    name: string
    type: string
    experience: string
    date: string
    rating?: number
    bookings?: number
    image: string
  }
}

export function ProviderDetailsDialog({ provider }: ProviderDetailsDialogProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          View Details
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Provider Details</DialogTitle>
          <DialogDescription>Detailed information about {provider.name}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="flex items-start gap-4 mb-6">
            <img
              src={provider.image || "/placeholder.svg"}
              alt={provider.name}
              className="h-24 w-24 rounded-md object-cover"
            />
            <div>
              <h3 className="text-xl font-bold">{provider.name}</h3>
              <p className="text-muted-foreground">{provider.type}</p>
              <p className="text-sm">{provider.experience}</p>
              <p className="text-xs text-muted-foreground">{provider.date}</p>
              {provider.rating && (
                <div className="mt-1 flex items-center">
                  <Star className="mr-1 h-4 w-4 fill-primary text-primary" />
                  <span className="font-medium">{provider.rating}</span>
                  <span className="mx-2">•</span>
                  <span className="font-medium">{provider.bookings} Bookings</span>
                </div>
              )}
            </div>
            <Badge className="ml-auto bg-green-50 text-green-700 hover:bg-green-50">Active</Badge>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-3 text-center">
                  <Calendar className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-xl font-bold">{provider.bookings || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Bookings</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <DollarSign className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-xl font-bold">${(provider.bookings || 0) * 85}</p>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <User className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-xl font-bold">{Math.floor((provider.bookings || 0) * 0.8)}</p>
                  <p className="text-sm text-muted-foreground">Unique Clients</p>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-2">Verification Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>ID Verification</span>
                    <span className="text-green-600">Verified</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Professional License</span>
                    <span className="text-green-600">Verified</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Background Check</span>
                    <span className="text-green-600">Passed</span>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="services" className="space-y-4 mt-4">
              <div className="space-y-3">
                {[
                  { name: "Basic Plumbing Repair", price: "$75/hour", bookings: 12 },
                  { name: "Pipe Installation", price: "$150", bookings: 8 },
                  { name: "Water Heater Repair", price: "$120", bookings: 6 },
                  { name: "Bathroom Fixture Installation", price: "$200", bookings: 4 },
                ].map((service, index) => (
                  <div key={index} className="flex justify-between items-center rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">{service.price}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{service.bookings} bookings</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="reviews" className="space-y-4 mt-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium">Rating Breakdown</h4>
                    <div className="flex items-center">
                      <Star className="mr-1 h-5 w-5 fill-primary text-primary" />
                      <span className="text-xl font-bold">{provider.rating}</span>
                      <span className="text-sm text-muted-foreground ml-2">({provider.bookings} reviews)</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { stars: 5, percentage: 80 },
                    { stars: 4, percentage: 15 },
                    { stars: 3, percentage: 5 },
                    { stars: 2, percentage: 0 },
                    { stars: 1, percentage: 0 },
                  ].map((rating) => (
                    <div key={rating.stars} className="flex items-center gap-2">
                      <div className="w-12 text-sm">{rating.stars} stars</div>
                      <Progress value={rating.percentage} className="h-2 flex-1" />
                      <div className="w-8 text-right text-sm">{rating.percentage}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    name: "John D.",
                    rating: 5,
                    comment: "Excellent service! Very professional and completed the job quickly.",
                  },
                  { name: "Sarah J.", rating: 5, comment: "Great work fixing our plumbing issue. Would hire again!" },
                  {
                    name: "Michael C.",
                    rating: 4,
                    comment: "Good service overall. Arrived on time and fixed the problem.",
                  },
                ].map((review, index) => (
                  <div key={index} className="rounded-lg border p-3">
                    <div className="flex justify-between mb-1">
                      <p className="font-medium">{review.name}</p>
                      <div className="flex">
                        {Array(5)
                          .fill(0)
                          .map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < review.rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                            />
                          ))}
                      </div>
                    </div>
                    <p className="text-sm">{review.comment}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          <Button variant="destructive">Suspend Provider</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

