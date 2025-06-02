"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle } from "lucide-react"
import { approveProvider, rejectProvider, reviewReport } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
import type { Provider, Report } from "@/lib/types"
// Import the ReportReviewDialog component
import { ReportReviewDialog } from "@/components/report-review-dialog"

export function ProviderApprovalCard({ provider }: { provider: Provider }) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleApprove = async () => {
    setIsLoading(true)
    const result = await approveProvider(provider.id)
    setIsLoading(false)

    if (result.success) {
      toast({
        title: "Provider approved",
        description: `${provider.name} has been approved as a service provider.`,
      })
    }
  }

  const handleReject = async () => {
    setIsLoading(true)
    const result = await rejectProvider(provider.id)
    setIsLoading(false)

    if (result.success) {
      toast({
        title: "Provider rejected",
        description: `${provider.name}'s application has been rejected.`,
      })
    }
  }

  return (
    <div className="flex flex-col space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-4">
        <img
          src={provider.image || "/placeholder.svg"}
          alt={provider.name}
          className="h-16 w-16 rounded-md object-cover"
        />
        <div>
          <h3 className="font-medium">{provider.name}</h3>
          <p className="text-sm text-muted-foreground">{provider.type}</p>
          <p className="text-sm">{provider.experience}</p>
          <p className="text-xs text-muted-foreground">{provider.date}</p>
        </div>
      </div>
      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={handleReject} disabled={isLoading}>
          <XCircle className="mr-2 h-4 w-4" />
          Reject
        </Button>
        <Button size="sm" onClick={handleApprove} disabled={isLoading}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Approve
        </Button>
      </div>
    </div>
  )
}

export function ReportReviewCard({ report }: { report: Report }) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleReview = async () => {
    setIsLoading(true)
    const result = await reviewReport(report.id)
    setIsLoading(false)

    if (result.success) {
      toast({
        title: "Report reviewed",
        description: `The report from ${report.reporter} has been reviewed.`,
      })
    }
  }

  return (
    <div className="flex flex-col space-y-4 rounded-lg border p-4">
      <div className="space-y-2">
        <div className="flex justify-between">
          <h3 className="font-medium">Report #{report.id}</h3>
          <span className="text-xs font-medium text-muted-foreground">{report.date}</span>
        </div>
        <p className="text-sm">
          <span className="font-medium">{report.reporter}</span> reported{" "}
          <span className="font-medium">{report.reported}</span>
        </p>
        <p className="text-sm text-muted-foreground">{report.reason}</p>
      </div>
      <div className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            alert("Report dismissed")
          }}
          disabled={isLoading}
        >
          Dismiss
        </Button>
        <ReportReviewDialog report={report} />
      </div>
    </div>
  )
}

