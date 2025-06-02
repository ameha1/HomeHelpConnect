// components/rating-dialog.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Star } from "lucide-react"

interface RatingDialogProps {
  bookingId: string
  serviceTitle: string
  providerName: string
  onRatingSubmitAction: (bookingId: string, rating: number) => void
}

export function RatingDialog({
  bookingId,
  serviceTitle,
  providerName,
  onRatingSubmitAction
}: RatingDialogProps) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)

  const handleSubmit = () => {
    if (rating > 0) {
      onRatingSubmitAction(bookingId, rating)
      setOpen(false)
    }
  }

  return (
    <>
      <Button 
        variant="default" 
        size="sm" 
        className="flex-1"
        onClick={() => setOpen(true)}
      >
        Rate Service
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Your Experience</DialogTitle>
            <DialogDescription>
              How would you rate {providerName}'s service for "{serviceTitle}"?
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoverRating || rating) 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={rating === 0}
            >
              Submit Rating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}