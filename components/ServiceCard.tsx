"use client"
import Link from "next/link"
import Image from "next/image"
import { Star, MapPin, Clock, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookingDialog } from "@/components/booking-dialog"
import { Service } from "@/lib/types"

interface ServiceCardProps {
  service: Service
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
      {/* Image Section */}
      <div className="relative aspect-video bg-gray-100">
        <Image
          src={service.image || "/placeholder-service.jpg"}
          alt={service.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {service.isPopular && (
          <Badge className="absolute top-2 left-2 bg-amber-500 hover:bg-amber-600">
            Popular
          </Badge>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-lg line-clamp-2">
            {service.title}
          </h3>
          <span className="font-bold text-homehelp-600 whitespace-nowrap">
            ETB {typeof service.price === "number" ? service.price.toFixed(2) : parseFloat(service.price).toFixed(2)}
          </span>
        </div>

        <div className="flex items-center mt-1 mb-2">
          <div className="flex items-center mr-3">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
            <span className="text-sm font-medium">
              {service.rating?.toFixed(1) || "New"}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            {service.reviewCount ? `(${service.reviewCount} reviews)` : "No reviews"}
          </span>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2 mb-4">
          {service.description}
        </p>

        <div className="mt-auto space-y-2">
          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="h-4 w-4 mr-2" />
            <span className="line-clamp-1">{service.location}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-2" />
            <span>{service.duration} mins</span>
          </div>
          {service.nextAvailable && (
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="h-4 w-4 mr-2" />
              <span>Next: {service.nextAvailable}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Section */}
      <div className="border-t p-4 flex justify-between gap-2">
        <Button variant="outline" size="sm" asChild className="flex-1">
          <Link href={`/services/${service.id}`}>
            View Details
          </Link>
        </Button>

        <BookingDialog 

          serviceId={service.id.toString()} 
          serviceTitle={service.title}
          onBookingSuccess={async (bookingData) => {
            console.log("Booking was successful!", bookingData);
            return Promise.resolve();
          }}

        />

      </div>
    </div>
  )
}