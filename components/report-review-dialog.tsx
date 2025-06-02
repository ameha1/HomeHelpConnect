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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { reviewReport } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
import type { Report } from "@/lib/types"

interface ReportReviewDialogProps {
  report: Report
}

export function ReportReviewDialog({ report }: ReportReviewDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [action, setAction] = useState<string>("investigate")
  const [notes, setNotes] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async () => {
    setIsLoading(true)
    const result = await reviewReport(report.id)
    setIsLoading(false)

    if (result.success) {
      toast({
        title: "Report reviewed",
        description: `The report has been ${action === "dismiss" ? "dismissed" : "marked for investigation"}.`,
      })
      setIsOpen(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Review</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Review Report</DialogTitle>
          <DialogDescription>
            Review the report from {report.reporter} about {report.reported}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between">
              <h3 className="font-medium">Report #{report.id}</h3>
              <span className="text-xs text-muted-foreground">{report.date}</span>
            </div>
            <p className="text-sm">
              <span className="font-medium">{report.reporter}</span> reported{" "}
              <span className="font-medium">{report.reported}</span>
            </p>
            <p className="text-sm">{report.reason}</p>
          </div>

          <div className="space-y-2">
            <Label>Action</Label>
            <RadioGroup defaultValue={action} onValueChange={setAction}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="investigate" id="investigate" />
                <Label htmlFor="investigate">Investigate further</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dismiss" id="dismiss" />
                <Label htmlFor="dismiss">Dismiss report</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="warning" id="warning" />
                <Label htmlFor="warning">Issue warning</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="suspend" id="suspend" />
                <Label htmlFor="suspend">Suspend account</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Admin Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about this report..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            Submit Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

