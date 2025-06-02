import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "lucide-react"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { toast } from "@/hooks/use-toast"

interface BookingDialogProps {
  serviceId: string
  serviceTitle: string
  providerName?: string
  homeownerName?: string
  onBookingSuccess: (bookingData: {
    service_id: string
    scheduled_date: string
    scheduled_time: string
    address: string
    notes?: string
    service_title?: string
    provider_name?: string
    homeowner_name?: string
    created_at?: string
    updated_at?: string
  }) => Promise<void> // Make it async
}

export function BookingDialog({ 
  serviceId, 
  serviceTitle, 
  providerName = 'Provider',
  homeownerName = 'Homeowner',
  onBookingSuccess 
}: BookingDialogProps) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [time, setTime] = useState("")
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !time || !address) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const formattedTime = time.includes(':') ? time.split(':').slice(0, 2).join(':') : time
      const currentDate = new Date().toISOString()
      
      await onBookingSuccess({
        service_id: serviceId,
        scheduled_date: date.toISOString().split('T')[0],
        scheduled_time: formattedTime,
        address,
        notes,
        // Include the additional fields the backend expects in response
        service_title: serviceTitle,
        provider_name: providerName,
        homeowner_name: homeownerName,
        created_at: currentDate,
        updated_at: currentDate
      })

      setOpen(false)
      // Reset form
      setDate(new Date())
      setTime("")
      setAddress("")
      setNotes("")

      toast({
        title: "Booking created successfully",
        variant: "default"
      })
    } catch (error) {
      console.error("Booking failed:", error)
      toast({
        title: "Failed to create booking",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="flex-1">
          Book Now
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book {serviceTitle}</DialogTitle>
          <DialogDescription>
            Fill in the details to schedule your service
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              step="1800" // Optional: 30-minute increments
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Booking..." : "Confirm Booking"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}


export default BookingDialog;