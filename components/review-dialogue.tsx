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
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Star } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import api from "@/lib/api"

interface ReviewDialogProps {
  bookingId: string
  serviceTitle: string
  providerName: string
  isOpen: boolean
  onOpenChangeAction: (open: boolean) => void
  onReviewSubmitAction: (bookingId: string, rating: number, reviewText: string) => Promise<void>
  existingRating?: number
  existingReview?: string
}

export function ReviewDialog({
  bookingId,
  serviceTitle,
  providerName,
  isOpen,
  onOpenChangeAction,
  onReviewSubmitAction,
  existingRating,
  existingReview
}: ReviewDialogProps) {
  const [rating, setRating] = useState(existingRating || 0)
  const [reviewText, setReviewText] = useState(existingReview || "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Please select a rating",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    try {
      await onReviewSubmitAction(bookingId, rating, reviewText)
      toast({
        title: "Review submitted successfully",
        variant: "default"
      })
      onOpenChangeAction(false)
    } catch (error) {
      toast({
        title: "Failed to submit review",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChangeAction}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Service</DialogTitle>
          <DialogDescription>
            Share your experience with {serviceTitle} by {providerName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="focus:outline-none"
              >
                <Star
                  className={`h-8 w-8 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                />
              </button>
            ))}
          </div>
          
          <Textarea
            placeholder="Tell others about your experience (optional)"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            className="min-h-[120px]"
          />
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChangeAction(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}