"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { BookingDialog } from "./booking-dialog"
import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Review {
  id: string;
  homeowner_id: string;
  homeowner_name: string;
  rating: number;
  review_text?: string;
  created_at: string;
}

interface ServiceDetailsDialogProps {
  service: {
    id: string;
    title: string;
    description: string;
    price: string;
    image: string;
    provider_name: string;
    rating: number;
    reviews?: Review[];
  };
}

export function ServiceDetailsDialog({ service }: ServiceDetailsDialogProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          View Details
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{service.title}</DialogTitle>
          <DialogDescription>Provided by {service.provider_name}</DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Service Image and Basic Info */}
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="relative h-48 w-full sm:w-48 rounded-lg overflow-hidden">
              <img
                src={service.image || "/placeholder-service.jpg"}
                alt={service.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Price</h3>
                <p className="text-2xl font-bold text-indigo-600">{service.price}</p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold">Rating</h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    {Array(5).fill(0).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${i < Math.round(service.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">
                    {service.rating.toFixed(1)} ({service.reviews?.length || 0} reviews)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Service Description */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Description</h3>
            <p className="text-gray-600">
              {service.description || "No description available."}
            </p>
          </div>

          {/* Provider Information */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">About the Provider</h3>
            <p className="text-gray-600">
              {service.provider_name} is a verified service provider with excellent ratings and reviews.
            </p>
          </div>

          {/* Reviews Section */}
         <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Reviews</h3>
            {service.reviews?.length ? (
              <div className="space-y-4">
                {service.reviews.map((review) => (
                  <div key={review.id} className="border-b pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {review.homeowner_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{review.homeowner_name}</p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating 
                                  ? 'fill-yellow-400 text-yellow-400' 
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    {review.review_text && (
                      <p className="text-sm text-gray-600">
                        {review.review_text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No reviews yet</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          <BookingDialog 
            serviceId={service.id} 
            serviceTitle={service.title}
            providerName={service.provider_name}
            homeownerName="You" // This would come from user context in a real implementation
            onBookingSuccess={async () => setIsOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}